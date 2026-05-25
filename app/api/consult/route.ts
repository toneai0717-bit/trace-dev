import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

const RECORDS_PERSONALITY = `あなたはプレイヤーが自分の記録・メモ・CRM・過去メール・議事録などを検索・参照するシステムです。
プレイヤーが確認したい情報に対して、シミュレーションのコンテキストと整合性のある具体的な事実・データ・記録を返してください。
返答のスタイル：
- 記録・メモとして自然な形式（日時・数値・事実）で返す
- 戦略アドバイスや意見は一切述べない（事実のみ）
- シミュレーションの前提条件に書かれていない「穴」を埋める補足情報を提供する
- 実際の業務記録のようにリアリティを持たせる
- 簡潔に3〜6行程度で返す`;

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 20, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { question, simContext, aiRole, messages } = await req.json();

    // プロンプトインジェクション対策：ユーザー入力は <USER_QUERY> タグで分離
    const recentFlow = Array.isArray(messages) && messages.length > 0
      ? `\n【現在のやり取りの流れ（参考）】\n${messages.slice(-4).map((m: { role: string; text: string }) =>
          `${m.role === "ai" ? aiRole : "プレイヤー"}：${m.text?.slice(0, 200) ?? ""}`
        ).join("\n\n")}`
      : "";

    const reply = await createMessageWithFallback({
      maxTokens: 512,
      system: `${RECORDS_PERSONALITY}

【シミュレーションの状況】
${simContext ?? ""}
${recentFlow}

プレイヤーが以下の記録・メモを参照しようとしています。記録システムとして事実のみを返してください。`,
      userContent: `<USER_QUERY>${(question ?? "").slice(0, 500)}</USER_QUERY>`,
    });

    if (!reply) throw new Error("返答の生成に失敗しました");

    return NextResponse.json({ reply, roleName: "記録・メモ" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "記録の参照に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
