import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";

const ROLES: Record<string, { name: string; personality: string }> = {
  boss: {
    name: "記録・メモ",
    personality: `あなたはプレイヤーが自分の記録・メモ・CRM・過去メール・議事録などを検索・参照するシステムです。
プレイヤーが確認したい情報に対して、シミュレーションのコンテキストと整合性のある具体的な事実・データ・記録を返してください。
返答のスタイル：
- 記録・メモとして自然な形式（日時・数値・事実）で返す
- 戦略アドバイスや意見は一切述べない（事実のみ）
- シミュレーションの前提条件に書かれていない「穴」を埋める補足情報を提供する
- 実際の業務記録のようにリアリティを持たせる
- 簡潔に3〜6行程度で返す`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { role, question, simContext, aiRole, messages } = await req.json();

    const roleInfo = ROLES[role] ?? ROLES.boss;

    const contextSummary = messages.length > 0
      ? `\n【現在のやり取りの流れ】\n${messages.slice(-4).map((m: { role: string; text: string }) =>
          `${m.role === "ai" ? aiRole : "プレイヤー"}：${m.text}`
        ).join("\n\n")}`
      : "";

    const reply = await createMessageWithFallback({
      maxTokens: 512,
      system: `${roleInfo.personality}

【シミュレーションの状況】
${simContext}
${contextSummary}

プレイヤーが相談してきたので、${roleInfo.name}として自然に返答してください。`,
      userContent: question,
    });

    if (!reply) throw new Error("返答の生成に失敗しました");

    return NextResponse.json({ reply, roleName: roleInfo.name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
