import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { jd: rawJd, simType = "email" } = await req.json();
    if (!rawJd || typeof rawJd !== "string") {
      return NextResponse.json({ error: "求人票が不正です" }, { status: 400 });
    }
    const jd = rawJd.slice(0, 8000);

    const isData = simType === "data";
    const isPriority = simType === "priority";
    const isReport = simType === "report";

    const system = isReport
      ? `求人票を元に、上司への報告・提案シミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- プレイヤーの名前は「戸根」とする
- AIは「上司」または「経営層」の役を演じる
- プレイヤーは状況・データを与えられ、上司に報告・提案を行う

【シナリオのリアリティ基準】
- 会社名・人物名は実在しそうな具体的な名前をつける
- 報告対象のデータ・状況は具体的な数値を含む
- ゴールは「特定の上司・経営層に対して、何かを伝え、合意・承認を得る」こと
- FIRST_MSGは「上司から『状況を整理して報告してくれ』という依頼」として書く
- シナリオ冒頭に「今日は○曜日」を明記する`
      : isPriority
      ? `求人票を元に、優先順位・タスク管理シミュレーションのシナリオを設計してください。

【重要なルール】
- プレイヤー = 求人票の職種の候補者（評価される側）
- プレイヤーの名前は「戸根」とする
- 「相手」はいない。プレイヤーは複数のタスクと状況に向き合い、優先順位と対応方針を問われる

【シナリオのリアリティ基準】
- 会社名・人名は実在しそうな具体的な名前をつける
- タスクは4〜6個、それぞれ締切・重要度・緊急度が異なる
- ゴールは「今日・今週どう動くかを決める」こと
- FIRST_MSGは「朝、複数のタスクが一気に降ってきた状況」として書く
- シナリオの冒頭に「今日は○曜日」を必ず明記する（月〜金のいずれか、シナリオに合わせて設定）`
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
- **マークダウン記法（**bold**など）は使わない。プレーンテキストで書く**
（メール形式不要。状況リストとして書く）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`;

    const reportUserContent = `求人票：${jd}

以下のタグで出力してください：

<TITLE>シミュレーションタイトル（20字以内）</TITLE>
<CONTEXT>以下の形式で出力（各項目は1〜2文、具体的な数値・固有名詞を含めて）：
<p><span class="label">【状況】</span>具体的な状況説明（会社名・役割・背景を含む）</p>
<p><span class="label">【データ】</span>報告に関係する具体的な数値・事実</p>
<p><span class="label">【課題】</span>報告が必要になった背景・問題</p>
<p><span class="label">【ミッション】</span>誰に何を報告し、何を合意・承認してもらうか</p>
</CONTEXT>
<AI_ROLE>上司の具体的な氏名・役職（例：営業本部長 山田健一）</AI_ROLE>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>上司からプレイヤーへの報告依頼メッセージ。以下のルールで書く：
- 冒頭に必ず「（上司の名前）：」とラベルをつける（例：「笹川部長：」）
- 上司はデータの詳細をまだ把握していない（だから報告を求めている）
- 「何か数字がよくないらしいが詳細は把握していない」くらいの温度感
- 上司が自分で推進・関与した施策については、それを守りたい立場が滲み出るような口調にする
- 「整理して報告してくれ」という依頼で締める
- データの数値を上司が自分で言い切らない（報告を待っている状態）
- 上司の温度感・プレッシャーが伝わるリアルな口調で（7行以内）</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`;

    const userContent = isReport ? reportUserContent : isPriority ? priorityUserContent : isData
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
<PLAYER_ORG>プレイヤー（戸根）が所属する会社・組織名のみ（例：株式会社リクルートエージェント、東海コンサルティング株式会社、PECジャパン株式会社）。JDの職種・業務内容から自然に導ける組織名を生成すること。役職や氏名は含めない。</PLAYER_ORG>
<TARGET_PERSONA>JDが求める人物像（1〜2文）</TARGET_PERSONA>
<FIRST_MSG>相手キャラクターからプレイヤーへの最初のビジネスメール。宛名・本文・署名を含むリアルな形式で、相手の立場・感情・温度感が伝わるように書く（7行以内）。宛名は「PLAYER_ORGタグの会社名　戸根様」の形式で書くこと。</FIRST_MSG>
<SCORE_LABELS>このJDの職種・人物像に合わせて、以下のコンピテンシーバンクから候補者評価に最も重要な軸をちょうど6個選び、カンマ区切りで列挙する。バンク外の造語は使わないこと。

【思考系】論理思考力, 概念化力, 戦略的思考, 分析力, 本質把握力, 仮説構築力
【対人系】傾聴力, 共感力, 影響力, 交渉力, 調整力, 信頼構築力, 巻き込み力, 提案力
【実行系】主体性, 推進力, 決断力, 粘り強さ, 目標達成力, スピード感
【適応系】状況適応力, 変化対応力, ストレス耐性, 曖昧耐性
</SCORE_LABELS>`;

    const systemWithConstraint = `${system}

【情報量の制限】
シナリオ内でリストや項目を列挙する場合（タスク一覧・添付ファイル・課題リストなど）、件数は必ず1〜10件以内に収めること。件数を増やすよりも、各項目の複雑さや状況のリアリティで難易度を表現すること。`;

    const text = await createMessageWithFallback({
      maxTokens: 4096,
      system: systemWithConstraint,
      userContent,
    });


    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const scoreLabels = extract("SCORE_LABELS")
      .split(",")
      .map((s) => s.trim().replace(/\*\*/g, "").replace(/[\*\_\`]/g, ""))
      .filter((s) => s.length > 0)
      .slice(0, 6);

    const playerOrg = extract("PLAYER_ORG");
    const result = {
      title: extract("TITLE"),
      context: extract("CONTEXT"),
      aiRole: extract("AI_ROLE"),
      targetPersona: extract("TARGET_PERSONA"),
      firstMsg: extract("FIRST_MSG"),
      scoreLabels: scoreLabels.length >= 3 ? scoreLabels : ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性", "実行力"],
      ...(playerOrg ? { playerOrg } : {}),
    };

    if (!result.title || !result.firstMsg) {
      throw new Error("シナリオの生成に失敗しました。もう一度お試しください。");
    }

    // 【設計意図】生成したシナリオをClaudeが自己レビューし、FAILなら1回だけ再生成する。
    // 「情報不足・矛盾・緊張感のなさ」を人間が毎回確認するコストを削減するため。
    // 再生成は1回限り（無限ループ防止）。2回目も低品質な場合はそのまま返す。
    const reviewText = await createMessageWithFallback({
      maxTokens: 256,
      system: `ビジネスシミュレーションシナリオの品質レビュアーです。以下の観点でPASS/FAILを判定してください：
1. 受験者が前提条件の情報だけで判断・対応できるか（情報不足・情報過多ではないか）
2. 数値・固有名詞・状況設定に矛盾や不自然な点がないか
3. ビジネスシナリオとして適度な緊張感があり、実力測定に適しているか

<VERDICT>PASSまたはFAIL</VERDICT>
<REASON>FAILの場合のみ、問題点を50文字以内で記載</REASON>`,
      userContent: `タイトル：${result.title}
状況：${(result.context ?? "").replace(/<[^>]*>/g, "").slice(0, 500)}
AIロール：${result.aiRole}
最初のメッセージ：${(result.firstMsg ?? "").slice(0, 500)}`,
    });

    const verdict = reviewText.match(/<VERDICT>([\s\S]*?)<\/VERDICT>/)?.[1]?.trim();

    let finalResult = result;

    if (verdict === "FAIL") {
      const retryText = await createMessageWithFallback({
        maxTokens: 4096,
        system: systemWithConstraint,
        userContent,
      });
      const re = (tag: string) => {
        const m = retryText.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim() : "";
      };
      const retryScoreLabels = re("SCORE_LABELS")
        .split(",")
        .map((s) => s.trim().replace(/\*\*/g, "").replace(/[\*\_\`]/g, ""))
        .filter((s) => s.length > 0)
        .slice(0, 6);
      const retryPlayerOrg = re("PLAYER_ORG");
      const retryTitle = re("TITLE");
      const retryFirstMsg = re("FIRST_MSG");
      if (retryTitle && retryFirstMsg) {
        finalResult = {
          title: retryTitle,
          context: re("CONTEXT"),
          aiRole: re("AI_ROLE"),
          targetPersona: re("TARGET_PERSONA"),
          firstMsg: retryFirstMsg,
          scoreLabels: retryScoreLabels.length >= 3 ? retryScoreLabels : result.scoreLabels,
          ...(retryPlayerOrg ? { playerOrg: retryPlayerOrg } : {}),
        };
      }
    }

    return NextResponse.json(finalResult);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "シナリオの生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
