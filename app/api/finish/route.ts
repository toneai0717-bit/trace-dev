import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chatLogs, targetPersona, scoreLabels } = await req.json();

    const labels: string[] = Array.isArray(scoreLabels) && scoreLabels.length >= 3
      ? scoreLabels
      : ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"];

    const scoreItems = labels.map((label, i) => `${i + 1}. ${label}`).join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `あなたは採用評価の専門家です。ビジネス交渉シミュレーションのログを分析し、候補者を評価してください。

この求人が求める人物像：「${targetPersona}」

【評価項目（各10点満点）】
${scoreItems}

以下のタグで出力してください（各フィールドは簡潔に）：
<SCORES>評価項目の順番通りにスコアをカンマ区切りで（例：${labels.map(() => "数値").join(",")}）</SCORES>
<OVERALL>総合評価コメント（2文）</OVERALL>
<PERSONALITY>人物像との合致度分析（2文）</PERSONALITY>
<DETAIL>各ラリーの詳細フィードバック</DETAIL>
<CRITICAL_POINT>この商談の最大の山場とプレイヤーの対応（1文）</CRITICAL_POINT>
<BEST_APPROACH>理想的な立ち回りの具体例（2文）</BEST_APPROACH>
<HIRING_RECOMMENDATION>強く推奨／推奨／要検討／非推奨 とその理由（1文）</HIRING_RECOMMENDATION>
<ONBOARDING_SCENARIO>入社後にこの候補者が真価を発揮しそうな具体的な場面・シナリオ（2〜3文）</ONBOARDING_SCENARIO>
<RISK_POINTS>採用した場合の懸念点とフォローアップすべきポイント（2〜3文）</RISK_POINTS>
<INTERVIEW_QUESTIONS>シミュレーションの各ラリーにおける「理想の行動」と「受験者が実際にとった行動」のギャップをもとに、面接で深掘りすべき質問を3〜5個、番号付きで列挙する。各質問は「第Nラリーで〜した場面について」のように具体的な場面を明示すること。準備された回答では答えにくい、行動の背景にある判断軸・優先順位・リスク認識を引き出す質問にすること。</INTERVIEW_QUESTIONS>`,
      messages: [
        {
          role: "user",
          content: `交渉ログ：\n${JSON.stringify(chatLogs, null, 2)}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const scoresRaw = extract("SCORES");
    const scores = scoresRaw
      .split(",")
      .map((s) => Math.min(Number(s.trim()), 10));

    return NextResponse.json({
      scores,
      overall: extract("OVERALL"),
      personality: extract("PERSONALITY"),
      detail: extract("DETAIL"),
      critical_point: extract("CRITICAL_POINT"),
      best_approach: extract("BEST_APPROACH"),
      hiring_recommendation: extract("HIRING_RECOMMENDATION"),
      onboarding_scenario: extract("ONBOARDING_SCENARIO"),
      risk_points: extract("RISK_POINTS"),
      interview_questions: extract("INTERVIEW_QUESTIONS"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
