import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 20, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { aiRole, lastAiMessage, rallyCount, context, playerOrg } = await req.json();

    const signatureInstruction = playerOrg
      ? `- 署名は「${playerOrg}　戸根」の形式で必ずメール末尾に入れること`
      : `- 署名は「戸根」のみでよい（社名不明の場合）`;

    const text = await createMessageWithFallback({
      maxTokens: 512,
      system: `あなたはビジネスシミュレーションのコーチです。
プレイヤーが「${aiRole}」との交渉・対話シミュレーションを行っています。
現在${rallyCount}回目のやり取りです。

直前の相手のメッセージを踏まえて、プレイヤーが次に送るべき
「返信内容（アクション）」と「狙い・戦略（意図）」のサンプルを1パターン提案してください。

【重要】
- アクションは実際に送るビジネスメール本文（150〜250文字）
- 意図は戦略の説明（50〜100文字）
- シナリオと相手の発言に合った自然な内容にすること
- ラリー${rallyCount}回目にふさわしい展開（序盤は情報収集、中盤は提案、終盤はクロージング）
${signatureInstruction}

以下のタグで返してください：
<ACTION>返信内容</ACTION>
<INTENT>狙い・戦略</INTENT>`,
      userContent: `相手（${aiRole}）の直前のメッセージ：\n${(lastAiMessage ?? "").slice(0, 500)}\n\nシナリオ背景：\n${(context ?? "").slice(0, 500)}`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const action = extract("ACTION");
    const intent = extract("INTENT");

    if (!action || !intent) throw new Error("サンプル生成に失敗しました");

    return NextResponse.json({ action, intent });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サンプルの生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
