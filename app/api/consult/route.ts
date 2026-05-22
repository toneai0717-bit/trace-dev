import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "../_retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ROLES: Record<string, { name: string; personality: string }> = {
  boss: {
    name: "上司",
    personality: `あなたはプレイヤーの直属の上司です。
経験豊富でビジネスの現場を知り抜いている。
プレイヤーに対しては指導的だが、答えを直接教えるのではなく、ヒントや視点を与えるスタイル。
「それを聞いてどうしたいの？」「そこで大事なのは何だと思う？」など、考えさせる質問を返すことも多い。
忙しいので、回答は簡潔。3〜5行程度。`,
  },
  colleague: {
    name: "同僚",
    personality: `あなたはプレイヤーの同期・同僚です。
同じ立場で一緒に仕事をしてきた仲間。気さくで本音で話せる関係。
「俺やったらこうするけどな」「前に似たような案件あったよ」など、経験談やカジュアルな意見を共有する。
ただし同僚なので専門的な権限はなく、あくまで個人的な意見として話す。
4〜6行程度で、タメ口気味でOK。`,
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

    const response = await withRetry(() => client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `${roleInfo.personality}

【シミュレーションの状況】
${simContext}
${contextSummary}

プレイヤーが相談してきたので、${roleInfo.name}として自然に返答してください。`,
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    }));

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    if (!reply) throw new Error("返答の生成に失敗しました");

    return NextResponse.json({ reply, roleName: roleInfo.name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
