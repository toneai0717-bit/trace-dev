import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { chatLogs: rawChatLogs, targetPersona, scoreLabels, consultLogs: rawConsultLogs } = await req.json();
    const chatLogs = Array.isArray(rawChatLogs) ? rawChatLogs.slice(0, 10) : [];
    const consultLogs = Array.isArray(rawConsultLogs) ? rawConsultLogs.slice(0, 10) : [];

    const labels: string[] = Array.isArray(scoreLabels) && scoreLabels.length >= 3
      ? scoreLabels
      : ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"];

    const scoreItems = labels.map((label, i) => `${i + 1}. ${label}`).join("\n");

    const text = await createMessageWithFallback({
      maxTokens: 4096,
      system: `あなたは採用評価の専門家です。ビジネス交渉シミュレーションのログを分析し、候補者を評価してください。

この求人が求める人物像：「${targetPersona}」

【評価項目（各10点満点）】
${scoreItems}

【重要】各ログには「行動（実際に送ったメッセージ）」と「意図（その裏にあった狙い・戦略）」の両方が含まれています。
評価では以下の2軸を必ず区別してください：
- 表面的な行動だけでなく、思考・戦略（意図）の質も評価する
- 意図が優れていても行動で伝わっていなければ「実行力不足」として指摘する
- 意図が浅くても行動が効果的な場合は「直感型」として特記する
- 意図と行動のギャップこそがTRACEの核心的な評価ポイント
- 評価文中では「action」「intent」という英語を使わず、必ず「行動」「意図」と書くこと

【採点基準（全軸共通）】
10点：相手の状況・感情を正確に読んだ上で、具体的な数値・代替案・根拠を示して相手を動かせた
8〜9点：適切な対応ができたが、一部根拠が弱い、または相手への配慮が足りない場面があった
6〜7点：方向性は合っているが、曖昧な表現・感情論・逃げの言い回しが散見された
4〜5点：相手の主張にほぼ押し切られた、または的外れな対応が目立った
1〜3点：ほとんど対応できていない、または関係を悪化させた
※隣接する点数（例：6と7）は「具体性・根拠の有無」で明確に区別すること

以下のタグで出力してください（各フィールドは簡潔に）：
<SCORES>評価項目の順番通りにスコアをカンマ区切りで、必ず${labels.length}個の数値のみ出力する（例：${labels.map(() => "数値").join(",")}）</SCORES>
<OVERALL>総合評価コメント（2文）</OVERALL>
<HIRING_RECOMMENDATION>以下の基準に従って判定し、判定結果とその理由を1文で出力する。
・強く推奨：平均スコア7点以上 かつ 意図が戦略的で行動と一致している場面が多い
・推奨：平均スコア5〜7点、意図は概ね適切だが行動への昇華に課題あり
・要検討：平均スコア3〜5点、または意図が浅い・場当たり的な場面が目立つ
・非推奨：平均スコア3点未満、または意図と行動が乖離し続けた・関係を悪化させた
</HIRING_RECOMMENDATION>
<ONBOARDING_SCENARIO>入社後にこの候補者が真価を発揮しそうな具体的な場面・シナリオ（2〜3文）</ONBOARDING_SCENARIO>
<RISK_POINTS>採用した場合の懸念点とフォローアップすべきポイント（2〜3文）</RISK_POINTS>
<INTERVIEW_QUESTIONS>各ラリーの意図と行動のギャップをもとに、面接で深掘りすべき質問をちょうど3個、番号付きで列挙する。以下のルールを必ず守ること：
・各質問は必ず異なる懸念点・評価軸から生成すること（同じテーマの繰り返し禁止）
・懸念点の例：意図と行動のズレ、判断の根拠の薄さ、リスク認識、対人・組織への働きかけ、自律性と協調のバランスなど
・「第Nラリーで〜と考えていたようですが、実際の行動では〜でした。なぜそのような判断をしましたか？」のように、思考と行動のズレを直接突く質問にすること</INTERVIEW_QUESTIONS>
<PERSONALITY>人物像との合致度分析（意図の傾向から読み取れる思考スタイルも含めて、2文）</PERSONALITY>
<CRITICAL_POINT>この交渉の最大の山場と、プレイヤーの意図・行動の対応（1文）</CRITICAL_POINT>
<BEST_APPROACH>理想的な思考・行動の具体例（意図と行動の両面で、2文）</BEST_APPROACH>
<DETAIL>各ラリーの詳細フィードバック。必ず以下の形式で全ラリー分を記載すること：
【ラリー1】
・行動評価（点数：X/10）：〜
・意図評価（点数：X/10）：〜
・総合コメント：〜
【ラリー2】...
※点数は必ず「X/10」の形式で記載すること。省略不可。</DETAIL>`,
      userContent: `交渉ログ（各ラリーの「行動」=実際に送ったメッセージ、「意図」=裏の狙い・戦略）：\n${JSON.stringify(chatLogs, null, 2)}${consultLogs && consultLogs.length > 0 ? `\n\n記録・メモ参照ログ（プレイヤーがシミュレーション中に確認した過去の記録・メモ）：\n${JSON.stringify(consultLogs, null, 2)}\n\n【参考情報として評価に活用すること】\n- 参照した情報が実際の判断・行動に活かされているかを確認する\n- 適切な情報を取りに行けているかは「情報収集力・準備力」として加点評価してよい\n- ただし記録参照の有無自体はスコアに直接影響させないこと（参照しないこと自体はマイナスではない）` : ``}`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const scoresRaw = extract("SCORES");
    const parsedScores = scoresRaw
      .split(",")
      .map((s) => Math.min(Math.max(Number(s.trim()), 0), 10))
      .filter((n) => !isNaN(n))
      .slice(0, labels.length);
    if (parsedScores.length === 0) {
      return NextResponse.json({ error: "スコアの解析に失敗しました。もう一度お試しください。" }, { status: 500 });
    }
    const fillScore = Math.round(parsedScores.reduce((a, b) => a + b, 0) / parsedScores.length);
    const scores = [
      ...parsedScores,
      ...Array(Math.max(0, labels.length - parsedScores.length)).fill(fillScore),
    ];

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
    return NextResponse.json({ error: "評価レポートの生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
