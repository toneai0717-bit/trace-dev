import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "../_retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { aiRole, lastAiMessage, rallyCount, context } = await req.json();

    const message = await withRetry(() => client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
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

以下のタグで返してください：
<ACTION>返信内容</ACTION>
<INTENT>狙い・戦略</INTENT>`,
      messages: [
        {
          role: "user",
          content: `相手（${aiRole}）の直前のメッセージ：\n${lastAiMessage}\n\nシナリオ背景：\n${context ?? ""}`,
        },
      ],
    }));

    const text = message.content[0].type === "text" ? message.content[0].text : "";

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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
