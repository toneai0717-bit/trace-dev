import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { aiRole, chatLogs, rallyCount } = await req.json();

    const history = chatLogs.map((l: { action: string }) => ({
      role: "user" as const,
      content: l.action,
    }));

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは「${aiRole}」です。
ビジネスメール形式を徹底してください（宛名・本文・結び・署名）。
相手の提案に対し、自社利益を最優先するプロとしてシビアかつリアルに対応してください。
返信は簡潔に300文字以内でまとめてください。

現在${rallyCount}回目のやり取りです（最低3回、最大6回）。
${rallyCount >= 3 ? "十分なデータが取れたと判断した場合は SHOULD_FINISH を yes にしてください。" : "まだデータ収集中なので SHOULD_FINISH は no にしてください。"}

以下のタグで返してください：
<REPLY>ビジネスメール本文</REPLY>
<SHOULD_FINISH>yes または no</SHOULD_FINISH>`,
      messages: history,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const reply = extract("REPLY");
    const shouldFinish = extract("SHOULD_FINISH") === "yes";

    if (!reply) throw new Error("返信の生成に失敗しました");

    return NextResponse.json({ reply, shouldFinish });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
