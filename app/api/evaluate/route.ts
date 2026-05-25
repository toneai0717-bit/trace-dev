import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { reportIds } = await req.json();

    if (!Array.isArray(reportIds) || reportIds.length < 3) {
      return NextResponse.json({ error: "3件以上のレポートが必要です" }, { status: 400 });
    }
    // 上限チェック
    if (reportIds.length > 10) {
      return NextResponse.json({ error: "一度に評価できるレポートは10件までです" }, { status: 400 });
    }

    // 各レポートを取得
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);

    if (error) throw error;
    if (!reports || reports.length < 2) {
      return NextResponse.json({ error: "レポートが見つかりませんでした" }, { status: 404 });
    }

    // レポートをサマリー形式に変換
    const reportSummaries = reports.map((r, i) => `
【シミュレーション${i + 1}：${r.sim_type === "email" ? "メール対応" : r.sim_type === "data" ? "数字分析" : r.sim_type === "priority" ? "優先順位" : "報告"}】
タイトル：${r.title}
評価軸：${r.score_labels.join("・")}
スコア：${r.score_labels.map((label: string, j: number) => `${label}${r.analysis.scores[j]}/10`).join("、")}
総合評価：${r.analysis.overall}
人物像：${r.analysis.personality}
採用推奨度：${r.analysis.hiring_recommendation}
`).join("\n---\n");

    const text = await createMessageWithFallback({
      maxTokens: 2048,
      system: `あなたは採用のプロフェッショナルです。複数のビジネスシミュレーション結果を統合し、候補者の本質的な能力・特性を評価してください。

【重要な評価原則】
- 思考パターンや行動は状況によって変わって当然。それ自体は問題ではない
- 複数回で見たいのは「一貫した思考パターン」ではなく「判断の根底にある価値観・優先軸」
- 「何を大事にして動いているか」は状況が変わっても変わらない。そこを見る
- 状況を正しく読んで、その場に合った判断ができているかも重要な評価軸
- 良い点だけでなく、リスクや懸念点も率直に記載する
- **マークダウン記法（**太字**、*斜体*など）は一切使わないこと**`,
      userContent: `以下は同一候補者が受けた${reports.length}回のシミュレーション結果です。

${reportSummaries}

以下のタグで統合評価を出力してください：

<OVERALL>3回を通じた総合所見（200字以内）</OVERALL>
<CONSISTENT_STRENGTHS>複数回を通じて見えた「判断の根底にある価値観・優先軸」と強み（箇条書き3点）</CONSISTENT_STRENGTHS>
<CONSISTENT_WEAKNESSES>複数回を通じて見えた課題・懸念・判断の癖（箇条書き2〜3点）</CONSISTENT_WEAKNESSES>
<PERSONALITY>候補者の本質的な人物像（100字以内）</PERSONALITY>
<ONBOARDING_SCENARIO>複数回のシミュレーションを踏まえた入社後の活躍シナリオ。どんな業務・環境で最も力を発揮するか（150字以内）</ONBOARDING_SCENARIO>
<RISK_POINTS>複数回を通じて見えたリスク・懸念点と、入社後に必要なフォローアップ（150字以内）</RISK_POINTS>
<RELIABILITY>評価の信頼性コメント（シミュレーション種類の多様性・回数を踏まえて）</RELIABILITY>
<FINAL_RECOMMENDATION>最終採用推奨度（「強く推奨」「推奨」「要検討」「非推奨」のいずれか）とその理由（100字以内）</FINAL_RECOMMENDATION>`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim().replace(/\*\*/g, "").replace(/[\*\_]/g, "") : "";
    };

    return NextResponse.json({
      reports,
      overall: extract("OVERALL"),
      consistentStrengths: extract("CONSISTENT_STRENGTHS"),
      consistentWeaknesses: extract("CONSISTENT_WEAKNESSES"),
      personality: extract("PERSONALITY"),
      onboardingScenario: extract("ONBOARDING_SCENARIO"),
      riskPoints: extract("RISK_POINTS"),
      reliability: extract("RELIABILITY"),
      finalRecommendation: extract("FINAL_RECOMMENDATION"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "統合評価の生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
