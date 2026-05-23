import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { createMessageWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { reportIds } = await req.json();

    if (!reportIds || reportIds.length < 2) {
      return NextResponse.json({ error: "2件以上のレポートが必要です" }, { status: 400 });
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
- 1回のシミュレーションは偶然の可能性がある。複数回で一貫している傾向が本質
- シミュレーションの種類が異なるほど、横断的に見られた特徴の信頼性が高い
- 良い点だけでなく、リスクや懸念点も率直に記載する`,
      userContent: `以下は同一候補者が受けた${reports.length}回のシミュレーション結果です。

${reportSummaries}

以下のタグで統合評価を出力してください：

<OVERALL>3回を通じた総合所見（200字以内）</OVERALL>
<CONSISTENT_STRENGTHS>複数回で一貫して見られた強み（箇条書き3点）</CONSISTENT_STRENGTHS>
<CONSISTENT_WEAKNESSES>複数回で一貫して見られた課題・懸念（箇条書き2〜3点）</CONSISTENT_WEAKNESSES>
<PERSONALITY>候補者の本質的な人物像（100字以内）</PERSONALITY>
<RELIABILITY>評価の信頼性コメント（シミュレーション種類の多様性・回数を踏まえて）</RELIABILITY>
<FINAL_RECOMMENDATION>最終採用推奨度（「強く推奨」「推奨」「要検討」「非推奨」のいずれか）とその理由（100字以内）</FINAL_RECOMMENDATION>`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    return NextResponse.json({
      reports,
      overall: extract("OVERALL"),
      consistentStrengths: extract("CONSISTENT_STRENGTHS"),
      consistentWeaknesses: extract("CONSISTENT_WEAKNESSES"),
      personality: extract("PERSONALITY"),
      reliability: extract("RELIABILITY"),
      finalRecommendation: extract("FINAL_RECOMMENDATION"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
