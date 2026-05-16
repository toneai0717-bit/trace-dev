import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { jd } = await req.json();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `求人票を元にビジネス交渉シミュレーションのシナリオを設計してください。各フィールドは必ず簡潔に。

求人票：${jd}

以下のタグで出力してください。各フィールドは短く簡潔に（CONTEXTは箇条書き3〜5行、FIRST_MSGは5行以内）：

<TITLE>商談タイトル（20字以内）</TITLE>
<CONTEXT><ul><li>状況1</li><li>数値データ（単価・数量など）</li><li>課題</li><li>プレイヤーのミッション</li></ul></CONTEXT>
<AI_ROLE>会社名・担当者名・役職</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>宛名と要件のみのビジネスメール（5行以内）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて候補者評価に最も重要な能力軸を3〜7個、カンマ区切りで列挙。軸名は5文字以内の日本語で（例：コスト交渉力,リスク管理力,関係構築力,数値分析力,戦略立案力）</SCORE_LABELS>`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("=== Claude response ===\n", text);

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const scoreLabels = extract("SCORE_LABELS")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const result = {
      title: extract("TITLE"),
      context: extract("CONTEXT"),
      aiRole: extract("AI_ROLE"),
      targetPersona: extract("TARGET_PERSONA"),
      firstMsg: extract("FIRST_MSG"),
      scoreLabels: scoreLabels.length >= 3 ? scoreLabels : ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"],
    };

    if (!result.title || !result.firstMsg) {
      throw new Error("シナリオの生成に失敗しました。もう一度お試しください。");
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
