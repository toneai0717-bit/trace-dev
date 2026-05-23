import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { jd, simType = "email" } = await req.json();

    const isData = simType === "data";
    const isPriority = simType === "priority";

    const system = isPriority
      ? `求人票を元に、優先順位・タスク管理シミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- プレイヤーの名前は「戸根」とする
- 「相手」はいない。プレイヤーは複数のタスクと状況に向き合い、優先順位と対応方針を問われる

【シナリオのリアリティ基準】
- 会社名・人名は実在しそうな具体的な名前をつける
- タスクは4〜6個、それぞれ締切・重要度・緊急度が異なる
- ゴールは「今日・今週どう動くかを決める」こと
- FIRST_MSGは「朝、複数のタスクが一気に降ってきた状況」として書く`
      : isData
      ? `求人票を元に、数字分析シミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- プレイヤーの名前は「戸根」とする
- 「相手」はいない。プレイヤーはデータと向き合い、判断・行動を問われる

【シナリオのリアリティ基準】
- 会社名は実在しそうな具体的な名前をつける
- 数値は必ず具体的に（売上・目標・昨対比・成約率など）
- ゴールを明確にする（「来月の戦略会議で報告」「上司に行動計画を提案」など）
- FIRST_MSGは「データレポート」として、具体的な数字を含む状況報告の形式で書く`
      : `求人票を元にビジネスシミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- AI = プレイヤーの交渉・対話相手（顧客・サプライヤー・現場マネージャーなど）
- FIRST_MSGはAIが演じる相手キャラクターからプレイヤーへの最初のメッセージ
- プレイヤーの名前は「戸根」とする。メール文中で宛名が必要な場合は「戸根様」と書く
- AIが求人票の職種そのものを演じてはいけない（例：HRBPの評価なら、AIは現場マネージャーを演じる）

【シナリオのリアリティ基準】
- 会社名・人名は実在しそうな具体的な名前をつける（「〇〇株式会社」ではなく「株式会社テクノメタル」など）
- 数値は必ず具体的に（「大幅な遅延」ではなく「3週間の遅延、損害額約800万円」など）
- 状況は現場の緊張感が伝わるレベルで書く
- FIRST_MSGは相手キャラクターが実際にそう言いそうなリアルなビジネスメールの書き方にする`;

    const priorityUserContent = `求人票：${jd}

以下のタグで出力してください：

<TITLE>シミュレーションタイトル（20字以内）</TITLE>
<CONTEXT>以下の形式で出力（各項目は1〜2文、具体的な固有名詞を含めて）：
<p><span class="label">【状況】</span>具体的な職場・役割・状況説明</p>
<p><span class="label">【課題】</span>今日直面している問題・プレッシャー</p>
<p><span class="label">【ミッション】</span>今日・今週中に何をどう動くかを決める</p>
</CONTEXT>
<AI_ROLE>優先順位・タスク管理シミュレーション</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>【今朝の状況】として、以下を含む内容を書く：
- 4〜6個のタスク・依頼・問題が同時に降ってきた状況（箇条書き）
- 各タスクに締切・依頼者・重要度のヒントを含める
- 最後に「あなたはどの順番で、何をやりますか？その理由も教えてください」と問いかける
（メール形式不要。状況リストとして書く）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`;

    const userContent = isPriority ? priorityUserContent : isData
      ? `求人票：${jd}

以下のタグで出力してください：

<TITLE>シミュレーションタイトル（20字以内）</TITLE>
<CONTEXT>以下の形式で出力（各項目は1〜2文、具体的な数値・固有名詞を含めて）：
<p><span class="label">【状況】</span>具体的な状況説明（会社名・数値を含む）</p>
<p><span class="label">【数値】</span>金額・期間・割合など具体的な数字</p>
<p><span class="label">【課題】</span>課題・背景・緊張感</p>
<p><span class="label">【ミッション】</span>プレイヤーが達成すべき具体的なゴール（例：来月の戦略会議で行動計画を提案する）</p>
</CONTEXT>
<AI_ROLE>数字分析シミュレーション</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>【データレポート】として、以下を含む状況報告を書く：
- 具体的な売上・目標・達成率・昨対比などの数値
- 注目すべき変化や異常値
- 最後に「あなたはこの数字を見て、どう動きますか？」と問いかける
（メール形式不要。データレポートとして箇条書きや表形式で書く）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`
      : `求人票：${jd}

以下のタグで出力してください：

<TITLE>シミュレーションタイトル（20字以内）</TITLE>
<CONTEXT>以下の形式で出力（各項目は1〜2文、具体的な数値・固有名詞を含めて）：
<p><span class="label">【状況】</span>具体的な状況説明（会社名・数値を含む）</p>
<p><span class="label">【数値】</span>金額・期間・割合など具体的な数字</p>
<p><span class="label">【課題】</span>課題・背景・緊張感</p>
<p><span class="label">【ミッション】</span>プレイヤーが今日達成すべき具体的なゴール</p>
</CONTEXT>
<AI_ROLE>AIが演じる相手の具体的な会社名・氏名・役職（例：株式会社アルファテック 営業部長 田中誠）</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>相手キャラクターからプレイヤーへの最初のビジネスメール。宛名・本文・署名を含むリアルな形式で、相手の立場・感情・温度感が伝わるように書く（7行以内）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`;

    const text = await createMessageWithFallback({
      maxTokens: 4096,
      system,
      userContent,
    });

    console.log("=== response ===\n", text);

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
