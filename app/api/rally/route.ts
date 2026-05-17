import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "../_retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { aiRole, firstMsg, messages, chatLogs, rallyCount } = await req.json();

    // Build proper alternating conversation history
    // firstMsg is the AI's opening message - include in system context, skip from history
    const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];
    let skippedFirst = false;
    for (const msg of messages) {
      if (!skippedFirst && msg.role === "ai") {
        skippedFirst = true;
        continue; // firstMsg is referenced in system prompt
      }
      skippedFirst = true;
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }

    // 空の場合は直近のユーザーアクションだけ入れてフォールバック
    if (claudeMessages.length === 0) {
      const lastAction = chatLogs[chatLogs.length - 1]?.action ?? "";
      claudeMessages.push({ role: "user", content: lastAction });
    }

    const message = await withRetry(() => client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは「${aiRole}」です。ビジネスの現場でプレイヤーと交渉・対話する相手キャラクターを演じてください。

【キャラクター設定】
- 自社・自部門の利益を最優先するプロフェッショナル
- 感情的にはならないが、不利な条件は明確に断る
- 相手の提案の弱点を突き、より有利な条件を引き出そうとする
- 一方的に押し切られず、粘り強く自分の立場を守る

【会話の流れ】
あなたはこの会話をこのメッセージで始めました：
「${firstMsg}」

現在${rallyCount}回目のやり取りです（最低3回、最大6回）。

【返信のルール】
- ビジネスメール形式（宛名・本文・結び・署名）
- 500文字以内で簡潔かつリアルに
- 前回までの自分の発言と一貫性を保つ
- 相手の意図を読んだ上で戦略的に応答する
${rallyCount >= 3 ? "- 十分な交渉が行われたと判断できる場合は SHOULD_FINISH を yes にしてください。" : "- まだ交渉の途中なので SHOULD_FINISH は no にしてください。"}

以下のタグで返してください：
<REPLY>ビジネスメール本文</REPLY>
<SHOULD_FINISH>yes または no</SHOULD_FINISH>`,
      messages: claudeMessages,
    }));

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    // タグが取れなかった場合はテキスト全体をフォールバックとして使う
    const reply = extract("REPLY") || text.replace(/<SHOULD_FINISH>[\s\S]*?<\/SHOULD_FINISH>/, "").trim();
    const shouldFinish = extract("SHOULD_FINISH") === "yes";

    if (!reply) throw new Error("返信の生成に失敗しました");

    return NextResponse.json({ reply, shouldFinish });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
