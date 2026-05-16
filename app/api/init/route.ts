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
          content: `求人票を元にビジネスシミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- AI = プレイヤーの交渉・対話相手（顧客・サプライヤー・現場マネージャーなど）
- FIRST_MSGはAIが演じる相手キャラクターからプレイヤーへの最初のメッセージ
- AIが求人票の職種そのものを演じてはいけない（例：HRBPの評価なら、AIは現場マネージャーを演じる）

求人票：${jd}

以下のタグで出力してください。各フィールドは短く簡潔に（CONTEXTは箇条書き3〜5行、FIRST_MSGは5行以内）：

<TITLE>シミュレーションタイトル（20字以内）</TITLE>
<CONTEXT><ul><li>状況説明</li><li>数値データがあれば</li><li>課題・背景</li><li>プレイヤーのミッション</li></ul></CONTEXT>
<AI_ROLE>AIが演じる相手の会社名・氏名・役職（プレイヤーの対話相手）</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>AIが演じる相手キャラクターからプレイヤーへの最初のメッセージ（5行以内）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて候補者評価に最も重要な能力軸を3〜7個、カンマ区切りで列挙。軸名は5文字以内の日本語で（例：傾聴力,課題構造化力,信頼構築力,提案力,調整力）</SCORE_LABELS>`,
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
