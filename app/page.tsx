"use client";

import { useState, useRef, useEffect } from "react";
import { track } from "@vercel/analytics";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

type Screen = "top" | "setup" | "sim" | "result";

interface SimConfig {
  title: string;
  context: string;
  aiRole: string;
  targetPersona: string;
  firstMsg: string;
  scoreLabels: string[];
}

interface ChatLog {
  action: string;
  intent: string;
}

interface AnalysisResult {
  scores: number[];
  overall: string;
  personality: string;
  detail: string;
  critical_point: string;
  best_approach: string;
  hiring_recommendation: string;
  onboarding_scenario: string;
  risk_points: string;
  interview_questions: string;
}

const DEFAULT_SCORE_LABELS = ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"];

const JOB_TEMPLATES: {
  label: string;
  patterns: { label: string; jd: string }[];
}[] = [
  {
    label: "営業",
    patterns: [
      {
        label: "新規顧客への提案",
        jd: `【職種】法人営業（新規開拓）
【ミッション】未開拓企業に対して自社製品・サービスを提案し、受注につなげる。
【業務内容】
・テレアポ・訪問による新規開拓
・顧客課題のヒアリングと提案資料作成
・価格・条件交渉、クロージング
【求める人物像】
・自ら動けるハングリー精神のある方
・顧客の課題を引き出し、的確な提案ができる方
・粘り強く交渉でき、数字にコミットできる方`,
      },
      {
        label: "既存顧客アップセル",
        jd: `【職種】法人営業（既存顧客担当）
【ミッション】既存顧客との関係を深め、追加提案・契約拡大を実現する。
【業務内容】
・担当顧客の定期訪問・課題ヒアリング
・利用状況の分析と上位プランへの提案
・更新時の条件交渉・継続率向上
【求める人物像】
・顧客との長期的な信頼関係を築ける方
・潜在ニーズを引き出し、タイミングよく提案できる方
・社内と顧客の間で調整力を発揮できる方`,
      },
      {
        label: "クレーム対応",
        jd: `【職種】カスタマーサクセス／営業（クレーム対応）
【ミッション】顧客からのクレーム・不満を適切に処理し、関係維持・改善につなげる。
【業務内容】
・クレーム内容のヒアリングと原因分析
・社内関係部門との連携・対応策立案
・顧客への謝罪・再発防止策の説明と合意形成
【求める人物像】
・感情的な場面でも冷静に対応できる方
・顧客の立場に立ちながら、会社の方針を守れる方
・迅速に社内を動かし、解決に導ける方`,
      },
      {
        label: "社内調整・根回し",
        jd: `【職種】営業（社内折衝・プロジェクト推進）
【ミッション】顧客への提案を実現するために、社内の各部門と調整・合意形成を行う。
【業務内容】
・顧客要望を社内に展開し、実現可能性の確認
・開発・製造・法務・経営層への説明と承認取得
・スケジュール・コストの社内交渉
【求める人物像】
・社内の利害関係者を動かせる説得力のある方
・顧客と社内の双方に誠実に向き合える方
・根回しと段取りを丁寧に進められる方`,
      },
    ],
  },
  {
    label: "購買・調達",
    patterns: [
      {
        label: "サプライヤー価格交渉",
        jd: `【職種】購買・調達
【ミッション】サプライヤーとの価格・納期・品質条件を交渉し、最適な調達を実現する。
【業務内容】
・部品・原材料の調達先選定と価格交渉
・納期短縮・コスト削減・品質改善の同時交渉
・長期契約条件の交渉と合意
【求める人物像】
・コスト・納期・品質の3軸を同時にマネジメントできる方
・サプライヤーと良好な関係を築きながら自社利益を守れる方
・データに基づいた論理的な交渉ができる方`,
      },
      {
        label: "新規サプライヤー開拓",
        jd: `【職種】購買・調達（新規開拓）
【ミッション】新規サプライヤーを発掘・評価し、安定した調達先を確保する。
【業務内容】
・新規サプライヤーの候補選定と初回接触
・生産能力・品質・価格・リスクの評価
・試作・評価フェーズの条件交渉と契約締結
【求める人物像】
・リスクを正確に評価し、判断できる方
・初対面の相手と信頼関係を素早く構築できる方
・社内の品質・製造・法務部門を巻き込める方`,
      },
      {
        label: "緊急調達・トラブル対応",
        jd: `【職種】購買・調達（緊急対応）
【ミッション】供給不足・品質問題などのトラブル発生時に、迅速に代替調達を確保する。
【業務内容】
・供給遅延・品質不良時の原因確認とサプライヤー交渉
・代替品・代替サプライヤーの緊急手配
・社内製造・品質部門との連携と進捗管理
【求める人物像】
・プレッシャー下でも冷静に優先順位をつけられる方
・スピーディーに動き、複数の選択肢を同時に進められる方
・社内外の関係者と素早く合意形成できる方`,
      },
      {
        label: "社内予算承認",
        jd: `【職種】購買・調達（社内折衝）
【ミッション】調達に必要な予算・承認を社内から獲得し、プロジェクトを前進させる。
【業務内容】
・調達計画の立案と経営・財務部門への説明
・コスト根拠・ROIの資料作成と承認取得
・部門間の優先度調整と予算配分の交渉
【求める人物像】
・数値に基づいた説得力のある説明ができる方
・経営層・財務部門の視点を理解して提案できる方
・粘り強く社内を動かせる主体性のある方`,
      },
    ],
  },
  {
    label: "企画・マーケ",
    patterns: [
      {
        label: "新規事業提案",
        jd: `【職種】新規事業企画
【ミッション】新規事業のアイデアを経営層に提案し、承認・予算獲得を実現する。
【業務内容】
・市場調査・競合分析・事業計画の立案
・経営層へのプレゼンテーションと質疑対応
・承認後の立ち上げ推進とKPI設定
【求める人物像】
・論理的かつ熱量を持って提案できる方
・反対意見に対して冷静に根拠を示せる方
・不確実な状況でも意思決定・推進できる方`,
      },
      {
        label: "他部門との連携調整",
        jd: `【職種】マーケティング・企画（社内調整）
【ミッション】施策を実行するために、複数部門の協力を取り付け、プロジェクトを推進する。
【業務内容】
・施策の目的・効果を各部門に説明し、協力を依頼
・リソース・スケジュールの調整と合意形成
・進捗管理と問題発生時の迅速な対応
【求める人物像】
・相手の立場を理解した上で巻き込める方
・利害が対立する場面でも着地点を見つけられる方
・主体的にプロジェクトをドライブできる方`,
      },
    ],
  },
  {
    label: "開発・エンジニア",
    patterns: [
      {
        label: "要件定義の認識合わせ",
        jd: `【職種】システム開発／エンジニア（要件定義）
【ミッション】顧客・事業部門の要望を正確に理解し、実現可能な要件として定義する。
【業務内容】
・顧客・事業部門へのヒアリングと要件の言語化
・技術的制約と要望のギャップ調整
・スコープ・スケジュール・コストの合意形成
【求める人物像】
・技術と事業の両方の言語で会話できる方
・曖昧な要望を整理し、明確化できる方
・「できない」ではなく「こうすればできる」を提案できる方`,
      },
      {
        label: "仕様変更・納期交渉",
        jd: `【職種】プロジェクトマネージャー／エンジニア
【ミッション】開発途中の仕様変更や納期要求に対して、現実的な対応を交渉・合意する。
【業務内容】
・仕様変更の影響範囲・工数の見積もりと説明
・顧客への追加費用・納期変更の交渉
・チーム内の調整と優先度の再設定
【求める人物像】
・技術的な根拠を非技術者にわかりやすく説明できる方
・顧客の感情に寄り添いながら現実的な落とし所を探れる方
・チームを守りながら顧客との関係も維持できる方`,
      },
    ],
  },
  {
    label: "人事",
    patterns: [
      {
        label: "採用面談（候補者対応）",
        jd: `【職種】採用担当・人事
【ミッション】候補者の能力・志向を正確に見極め、自社への入社を促す面談を実施する。
【業務内容】
・候補者の経験・スキル・志向のヒアリング
・自社の魅力の訴求と条件のすり合わせ
・懸念払拭と内定承諾に向けたクロージング
【求める人物像】
・候補者の本音を引き出せるコミュニケーション力のある方
・自社と候補者双方にとって最善の判断ができる方
・誠実さと説得力を両立できる方`,
      },
      {
        label: "社内課題のヒアリング",
        jd: `【職種】人事・HRビジネスパートナー
【ミッション】現場マネージャーにヒアリングし、組織・人材課題を特定して解決策を提案する。
【業務内容】
・現場マネージャーへの定期ヒアリング
・組織課題の構造化と優先度整理
・人事施策の提案と実行支援
【求める人物像】
・現場の信頼を獲得し、本音を引き出せる方
・課題を整理し、経営と現場の橋渡しができる方
・データと感覚の両方で判断できる方`,
      },
    ],
  },
  {
    label: "コンサル",
    patterns: [
      {
        label: "課題提起・提案",
        jd: `【職種】経営コンサルタント
【ミッション】クライアント企業に課題を提起し、解決策を提案・承認を得る。
【業務内容】
・クライアントへの現状分析結果のプレゼン
・課題の根本原因の説明と改善提案
・反論・懸念への対応と合意形成
【求める人物像】
・仮説思考で本質的な課題を捉えられる方
・データと論理で説得できる方
・クライアントの感情と組織の論理を両方読める方`,
      },
      {
        label: "クライアントへのフィードバック",
        jd: `【職種】コンサルタント（プロジェクト推進）
【ミッション】プロジェクト中間報告でクライアントに厳しいフィードバックを伝え、方向修正を合意する。
【業務内容】
・進捗状況と課題の報告
・当初計画からの乖離の説明と原因分析
・方向修正案の提示と合意形成
【求める人物像】
・耳の痛いことを誠実に伝えられる方
・感情的な反応に動じず、建設的な議論に持ち込める方
・クライアントの信頼を維持しながら軌道修正できる方`,
      },
    ],
  },
];

const RECOMMENDATION_COLOR: Record<string, string> = {
  "強く推奨": "bg-emerald-50 border-emerald-400 text-emerald-800",
  "推奨": "bg-blue-50 border-blue-400 text-blue-800",
  "要検討": "bg-amber-50 border-amber-400 text-amber-800",
  "非推奨": "bg-red-50 border-red-400 text-red-800",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("top");
  const [jd, setJd] = useState(`《兵庫県洲本市》蓄電バッテリーパック部材の購買業務【PEC　エナジーソリューション事業部】
500万円〜700万円
購買・資材調達

電気・電子 半導体

兵庫県

仕事内容
【職務内容】
●調達部のミッション
AIの拡大など急激に増加してるデータを管理するインフラであるデータセンターの拡大において、顧客要望を満たす調達スキームによるサプライチェーンの先導約を担い、安定供給とCF改善と競争力強化の推進をすることがわれわれのミッションです。

●購買課のミッション
・データセンター向けバッテリーモジュールにおける、パートナー様生産能力検証・戦略策定、安定調達、在庫最適化、量産購買ガバナンス(メキシコ・国内)

●募集背景
著しい成長を遂げているデータセンター事業に携わり、ともにパナソニックグループを牽引する仲間を募集します。

●担当業務と役割
・データセンター向けバッテリーモジュールの量産部品の購買業務。
・人々の生活に直結する社会インフラのデータセンタ事業で、部品安定供給は絶対条件で、重責はありますが同時に大きなやりがいを感じる業務です。
・日本国内に加え、メキシコ・中国・東南アジア諸国のパートナー様から、グローバルサプライチェーンを駆使した購買を担当いただけます。
・将来メキシコで活躍いただく可能性もあります。

●具体的な仕事内容
・担当いただくパートナー様からの購買業務(発注、納期交渉、納入、在庫管理)
・パートナー様の金型・設備投資伴う生産能力の検証と確保。
・生産活動の最上流である購買ポジションで、営業・製造・品質・ロジスティックス部門と連携した調整業務。
・メキシコ工場の部品購買支援、現地出張いただくこともあります。
・これまでの経験値から新しいアイデア・周知を植え付けて組織を活性化いただくことも期待します。

●この仕事を通じて得られること
・これまで経験したことのない成長を遂げている事業であり、緊張感のある業務ですが、それだけ大きな達成感があります。
・データセンターは社会インフラに位置付けられ、人々の生活になくてはならないものであり、市場の成長を感じることとグローバルの社会に貢献していることが実感できます。
・職場の雰囲気は明るく、誰もが話しやすいメンバーです。これまでキャリアと新入社員を積極的に迎え入れていていますので歓迎するムードも高いです。

応募資格
必須(MUST)
・パソコン操作（Excel、Powerpoint）
・電気・機構・回路量産部品の購買業務経験3年以上
・PCスキル　Office, Outlook, MS Teams

歓迎(WANT)
・サプライヤー様と良好な関係を構築できる社交性ある方
・海外駐在の経験のある方、TOEIC500点以上
・ERPシステム実務経験のある方

【人柄・コンピテンシー】
・周囲とコミュニケーションがスムーズにとれる
・失敗を恐れず課題に向き合って果敢にチャレンジすることができる
・チームマネジメントに関し、積極的にリーダーシップが取れる
・冷静な分析力と大胆な判断が取れる`);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [simConfig, setSimConfig] = useState<SimConfig | null>(null);
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string; intent?: string }[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [action, setAction] = useState("");
  const [intent, setIntent] = useState("");
  const [rallyCount, setRallyCount] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function initSimulation() {
    if (jd.trim().length < 10) return;
    setLoading(true);
    setLoadingMsg("シナリオを生成中...");
    setError("");
    try {
      const res = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "シナリオ生成に失敗しました");
        setLoading(false);
        return;
      }

      track("simulation_started");
      setSimConfig(data);
      setMessages([{ role: "ai", text: data.firstMsg }]);
      setScreen("sim");
      setLoading(false);
    } catch (e) {
      showToast("通信エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  async function processRally() {
    if (!action.trim() || !intent.trim() || !simConfig) return;

    const savedAction = action;
    const savedIntent = intent;
    const newLog = { action, intent };
    const newLogs = [...chatLogs, newLog];
    const newMessages = [
      ...messages,
      { role: "user" as const, text: action, intent },
    ];

    setMessages(newMessages);
    setChatLogs(newLogs);
    setAction("");
    setIntent("");
    const newCount = rallyCount + 1;
    setRallyCount(newCount);

    setLoading(true);
    setLoadingMsg("相手が返信を作成中...");

    try {
      const res = await fetch("/api/rally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiRole: simConfig.aiRole,
          firstMsg: simConfig.firstMsg,
          messages: newMessages,
          chatLogs: newLogs,
          rallyCount: newCount,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "返信の取得に失敗しました");
        setAction(savedAction);
        setIntent(savedIntent);
        setLoading(false);
        return;
      }

      setMessages([...newMessages, { role: "ai", text: data.reply }]);

      if (data.shouldFinish || newCount >= 6) {
        await finishSimulation(newLogs);
      } else {
        setLoading(false);
      }
    } catch (e) {
      showToast("通信エラーが発生しました。もう一度お試しください。");
      setAction(savedAction);
      setIntent(savedIntent);
      setLoading(false);
    }
  }

  async function finishSimulation(logs: ChatLog[]) {
    setLoadingMsg("評価レポートを生成中...");
    try {
      const res = await fetch("/api/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatLogs: logs,
          targetPersona: simConfig?.targetPersona ?? "",
          scoreLabels: simConfig?.scoreLabels ?? [],
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "評価レポートの生成に失敗しました");
        setLoading(false);
        return;
      }

      track("simulation_completed");
      setAnalysis(data);
      setScreen("result");
      setLoading(false);
    } catch (e) {
      showToast("通信エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  function downloadPDF() {
    window.print();
  }

  function loadDebug() {
    setAnalysis({
      scores: [8, 7, 9, 6, 8],
      overall: "グローバルサプライチェーンの複雑な状況下でも冷静に優先順位を見極め、粘り強く交渉を進めることができる人物像が浮かび上がった。",
      personality: "論理的かつ誠実なタイプ。感情的にならず事実ベースで交渉を進める姿勢が一貫しており、長期的な信頼関係構築を重視している。",
      detail: "初回の納期交渉において、相手の状況を確認しながら代替案を提示するアプローチは高く評価できる。一方で、価格交渉の場面では数値的な根拠を早期に提示できると、より説得力が増したと考えられる。全体を通じてコミュニケーションは丁寧で、サプライヤーとの関係構築を意識した言動が見られた。",
      critical_point: "第3ラリーでの納期短縮要求の場面。ここでの判断が商談全体の流れを左右した。強引に押すのではなく、相手のキャパシティを確認した上で段階的な対応を提案したことで、信頼を損なわずに要求を通すことができた。",
      best_approach: "冒頭で発注背景とデータセンター向け案件の重要性を共有した上で、サプライヤー側の制約を引き出しながら双方にとって最適な着地点を探る交渉スタイルが理想的。価格・納期・品質のトレードオフを明確に提示しつつ、長期取引の観点から関係性を強調する。",
      hiring_recommendation: "強く推奨：論理的思考と状況適応力のバランスが優れており、グローバル購買業務において即戦力となる可能性が高い。特にサプライヤーとの信頼関係構築を重視する姿勢は、本ポジションの要件に合致している。",
      onboarding_scenario: "入社後3〜6ヶ月の立ち上げ期において、既存サプライヤーとの定期レビュー交渉を早期に担当させることで真価を発揮すると想定される。特に複数部門との連携が必要な調整業務では、冷静な状況判断力と誠実なコミュニケーションスタイルが組織内の信頼獲得につながるだろう。メキシコ工場との連携業務においても、準備を徹底する姿勢がリスク管理面で貢献できる。",
      risk_points: "価格交渉における数値的な根拠の提示が遅い傾向があり、タフな交渉相手に対してはやや受け身になる可能性がある。入社後は価格分析・コスト構造の把握トレーニングを早期に実施することを推奨する。また、慎重な判断スタイルゆえ、スピードが求められる緊急調達場面では意思決定のサポート体制を整えておくと良い。",
      interview_questions: "1. 第2ラリーで価格の数値根拠を提示せず関係性の話に切り替えた場面について、なぜその判断をしたのか教えてください。価格交渉において数値よりも関係性を優先した理由は何ですか？\n2. 第3ラリーで納期短縮を強く求めた際、相手が難色を示した時点でどのような選択肢を頭の中で検討していましたか？もし相手が完全に拒否した場合の次の手はありましたか？\n3. 今回のシミュレーション全体を通じて、交渉において「譲れないライン」と「妥協できるライン」をどう設定していましたか？事前にどこまで考えていましたか？\n4. 第1ラリーで相手の状況確認から入ったことは評価できますが、その情報をその後の交渉にどう活かしましたか？実際の購買業務でも同様のアプローチをとりますか？",
    });
    setSimConfig({
      title: "バッテリー部材 納期・価格交渉",
      context: "<ul><li>発注数量：月産5,000個 → 7,500個に増産要請</li><li>現行単価：¥2,800/個、目標：¥2,500以下</li><li>納期：現行6週間 → 4週間に短縮要請</li><li>ミッション：増産・コスト削減・納期短縮を同時に達成せよ</li></ul>",
      aiRole: "田中部長 / 中堅サプライヤー株式会社アルファテック 営業部長",
      targetPersona: "サプライヤーと良好な関係を維持しながら、コスト・納期・品質の3軸を同時に交渉できる購買のプロ。",
      firstMsg: "お世話になっております。アルファテックの田中です。\n先日ご連絡いただいた増産のご要望の件で、一度詳しくお話しできればと思いご連絡しました。\n弊社としても前向きに検討したいのですが、現状の生産ラインの制約もありまして…。\nまずは現状をご確認いただけますでしょうか。",
      scoreLabels: ["コスト交渉力", "リスク管理力", "関係構築力", "数値分析力", "戦略立案力"],
    });
    setScreen("result");
  }

  function getRecommendationKey(rec: string) {
    for (const key of Object.keys(RECOMMENDATION_COLOR)) {
      if (rec.includes(key)) return key;
    }
    return "要検討";
  }

  const scoreLabels = simConfig?.scoreLabels ?? DEFAULT_SCORE_LABELS;

  const radarData = analysis
    ? {
        labels: scoreLabels,
        datasets: [
          {
            data: analysis.scores.map((s) => Math.min(Number(s), 10)),
            backgroundColor: "rgba(37, 99, 235, 0.15)",
            borderColor: "rgba(37, 99, 235, 0.8)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(37, 99, 235, 1)",
            pointRadius: 4,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-white font-semibold">{loadingMsg}</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-1.5 flex justify-between items-center shadow-lg">
        <button
          onClick={() => setScreen("top")}
          className="font-black tracking-widest text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent hover:opacity-70 transition-opacity"
        >
          TRACE
        </button>
        <div className="text-xs text-slate-400">
          {screen === "top" && "仕事シミュレーション採用"}
          {screen === "setup" && "仕事シミュレーション採用"}
          {screen === "sim" && `Rally ${rallyCount} / 最大6`}
          {screen === "result" && "評価レポート"}
        </div>
      </header>

      {/* Top / Landing screen */}
      {screen === "top" && (
        <div className="min-h-[calc(100vh-44px)] bg-slate-900 text-white">

          {/* Hero */}
          <div className="flex flex-col items-center justify-center text-center px-6 py-24">
            <p className="text-xs tracking-widest text-blue-400 uppercase mb-4">Next Generation Hiring</p>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              SPIでは測れない、<br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                本物の仕事力
              </span>
              を見抜く。
            </h1>
            <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed mb-10">
              求人票を貼るだけで、AIがリアルな業務シナリオを生成。<br />
              候補者が実際にどう動くかを、採用前に確かめる。
            </p>
            <button
              onClick={() => setScreen("setup")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-2xl text-sm transition-colors"
            >
              無料で試す →
            </button>
          </div>

          {/* SPIの問題点 */}
          <div className="bg-slate-800 px-6 py-16">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-xs tracking-widest text-slate-400 uppercase mb-8">The Problem</p>
              <h2 className="text-2xl font-bold text-center mb-10">SPIでは、本物の仕事力を測れない。</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    ),
                    title: "対策で突破できる",
                    desc: "SPIは暗記と練習で点数が上がる。本来の能力を測れていない。",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="9" y1="12" x2="15" y2="12"/>
                      </svg>
                    ),
                    title: "業務と無関係",
                    desc: "言語・非言語の問題と、実際の仕事能力は別物。採用後にミスマッチが起きる。",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    ),
                    title: "高得点でも活躍しない",
                    desc: "SPIで上位でも、実務で使い物にならないケースが頻発する。テストの点数と仕事の成果が連動していない。",
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-600/60 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-slate-300">
                      {item.icon}
                    </div>
                    <p className="font-bold text-sm mb-2">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 答え */}
          <div className="bg-slate-900 px-6 py-24 text-center border-t-2 border-blue-500/30">
            <p className="text-xs tracking-widest text-blue-400 uppercase mb-6">The Answer</p>
            <p className="text-slate-300 text-2xl font-bold mb-16">ではどうやって仕事の能力を測るのか。</p>
            <p className="text-white font-black text-3xl md:text-5xl leading-tight mb-14">
              仕事の能力は、<br />仕事で測ればいい。
            </p>
            <p className="text-white font-bold text-2xl leading-relaxed mt-10 text-center">
              TRACEは、求人票から業務シナリオを生成し、<br />候補者に対応させる。それがそのまま評価になる。
            </p>
          </div>

          {/* TRACEの仕組み */}
          <div className="px-6 py-16 bg-slate-800 border-t-2 border-blue-500/30">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-xs tracking-widest text-blue-400 uppercase mb-8">How it works</p>
              <h2 className="text-2xl font-bold text-center mb-10">3ステップで採用精度が上がる。</h2>
              <div className="space-y-4">
                {[
                  { step: "01", title: "求人票を貼るだけ", desc: "求人票をペーストすると、AIがその職種に合わせたリアルな業務シナリオを自動生成。営業なら商談、企画なら提案交渉など、仕事の現場そのままのシナリオが作られる。" },
                  { step: "02", title: "候補者がシナリオに挑戦", desc: "候補者はAIが演じる取引先・上司・顧客と実際に会話する。返答内容だけでなく、その狙いや戦略まで入力することで思考プロセスまで可視化される。" },
                  { step: "03", title: "AIが即座に評価レポートを生成", desc: "求人票に合わせた評価軸で多角的にスコアリング。採用推奨度・入社後の活躍シナリオ・懸念点・面接で深掘りすべき質問まで、即座に詳細レポートを出力する。" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 items-center bg-slate-600/50 rounded-2xl p-5">
                    <p className="text-3xl font-black text-blue-500/30 flex-shrink-0">{item.step}</p>
                    <div>
                      <p className="font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-slate-800 px-6 py-16 text-center">
            <h2 className="text-2xl font-bold mb-4">まず、お試しください。</h2>
            <p className="text-slate-400 text-sm mb-8">求人票があれば、今すぐ無料で体験できます。</p>
            <button
              onClick={() => setScreen("setup")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-2xl text-sm transition-colors"
            >
              無料で試す →
            </button>
            <p className="text-xs text-slate-600 mt-4">クレジットカード不要 · アカウント登録不要</p>
            <div className="mt-6 opacity-20 hover:opacity-100 transition-opacity">
              <button onClick={loadDebug} className="text-xs text-slate-500 hover:text-slate-300">▶ debug: result</button>
            </div>
          </div>

        </div>
      )}

      {/* Setup screen */}
      {screen === "setup" && (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-800 mb-1">シミュレーション開始</h2>
            <p className="text-sm text-slate-500 mb-6">職種・シナリオを選ぶか、求人票を直接貼り付けてください。</p>

            {/* 職種選択 */}
            <label className="block text-xs font-bold text-slate-500 mb-2">職種から選ぶ</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {JOB_TEMPLATES.map((job) => (
                <button
                  key={job.label}
                  onClick={() => setSelectedJob(selectedJob === job.label ? null : job.label)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    selectedJob === job.label
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {job.label}
                </button>
              ))}
            </div>

            {/* パターン選択 */}
            {selectedJob && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-violet-500 mb-2">シナリオパターン</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TEMPLATES.find((j) => j.label === selectedJob)?.patterns.map((pattern) => (
                    <button
                      key={pattern.label}
                      onClick={() => setJd(pattern.jd)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        jd === pattern.jd
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                      }`}
                    >
                      {pattern.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-xs font-bold text-slate-500 mb-1">求人票（JD）</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={8}
              placeholder="ここに求人票を貼り付けてください..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors mb-4"
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              onClick={initSimulation}
              disabled={jd.trim().length < 10}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              シミュレーションを開始する
            </button>
          </div>
        </div>
      )}

      {/* Sim screen */}
      {screen === "sim" && simConfig && (
        <div className="flex flex-col md:flex-row gap-3 md:gap-5 h-[calc(100dvh-44px)] p-3 md:p-5">
          {/* Context: PC=左カラム固定 / SP=トグル */}
          <div className="md:w-52 md:flex-shrink-0 flex flex-col">
            {/* SPのトグルボタン */}
            <button
              onClick={() => setShowContext(!showContext)}
              className="md:hidden flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-blue-600 shadow-sm mb-2"
            >
              <span>📋 {simConfig.title}</span>
              <span>{showContext ? "▲ 閉じる" : "▼ シナリオ確認"}</span>
            </button>
            {/* コンテキスト本体 */}
            <div className={`${showContext ? "block" : "hidden"} md:block bg-white rounded-2xl border border-slate-100 px-3 py-4 overflow-y-auto shadow-sm flex-1`}>
              <h3 className="font-bold text-blue-600 text-xs mb-3 hidden md:block leading-snug">{simConfig.title}</h3>
              <div
                className="text-[11px] text-slate-600 leading-relaxed space-y-2 [&_.label]:font-bold [&_.label]:text-slate-700 [&_p]:leading-snug"
                dangerouslySetInnerHTML={{ __html: simConfig.context }}
              />
            </div>
          </div>

          {/* Right: chat */}
          <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
            <div ref={chatRef} className="flex-1 bg-white rounded-2xl border border-slate-100 p-5 overflow-y-auto shadow-sm flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "ai"
                      ? "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  }`}>
                    {msg.text}
                    {msg.intent && (
                      <span className="block text-xs mt-2 pt-2 border-t border-white/20 text-blue-100 italic">
                        戦略: {msg.intent}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1">返信内容（アクション）</label>
                  <textarea
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="相手へのメッセージを書いてください..."
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-violet-400 mb-1">狙い・戦略（意図）</label>
                  <textarea
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    rows={3}
                    className="w-full border border-violet-200 bg-violet-50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-400 transition-colors"
                    placeholder="このメッセージの狙いを書いてください..."
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                onClick={processRally}
                disabled={!action.trim() || !intent.trim()}
                className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result screen */}
      {screen === "result" && analysis && (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ① スコア → 結果を一発で把握 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <p className="text-base font-bold text-slate-600 mb-3 text-center">評価スコア</p>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="w-56 flex-shrink-0">
                {radarData && (
                  <Radar data={radarData} options={{
                    scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: "#e2e8f0" }, pointLabels: { font: { size: 9 }, color: "#64748b" } } },
                    plugins: { legend: { display: false } },
                  }} />
                )}
              </div>
              <div className="flex-1 w-full space-y-3">
                {scoreLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-slate-600 font-semibold text-base w-24 flex-shrink-0">{label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-4">
                        <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${(analysis.scores[i] / 10) * 100}%` }} />
                      </div>
                      <span className="font-black text-slate-800 text-2xl w-8 text-right">{analysis.scores[i]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ② 採用推奨度 → スコアを見た上で判定 */}
          <div className={`rounded-2xl border-2 p-6 text-center ${RECOMMENDATION_COLOR[getRecommendationKey(analysis.hiring_recommendation)]}`}>
            <p className="text-sm font-bold mb-2 opacity-60">採用推奨度</p>
            <p className="text-5xl font-black mb-4">{getRecommendationKey(analysis.hiring_recommendation)}</p>
            <p className="text-base leading-relaxed">{analysis.overall}</p>
          </div>

          {/* ③ 活躍シナリオ・懸念点 → なぜその推奨度か */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
              <p className="text-xs font-bold text-emerald-600 mb-2">🚀 入社後の活躍シナリオ</p>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.onboarding_scenario}</p>
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
              <p className="text-xs font-bold text-red-500 mb-2">⚠️ 懸念点・フォローアップ</p>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.risk_points}</p>
            </div>
          </div>

          {/* ④ 面接で確認すべき質問 */}
          {analysis.interview_questions && (
            <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5">
              <p className="text-xs font-bold text-violet-600 mb-3">🎤 面接で確認すべき質問</p>
              <ol className="space-y-3">
                {analysis.interview_questions
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line, i) => {
                    const match = line.match(/^\d+\.\s*(.*)/);
                    const text = match ? match[1] : line;
                    return (
                      <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-violet-500 font-black flex-shrink-0">{i + 1}.</span>
                        <span>{text}</span>
                      </li>
                    );
                  })}
              </ol>
            </div>
          )}

          {/* ⑤ 詳細レポート → 折りたたみ */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {showDetail ? "▲ 詳細レポートを閉じる" : "▼ 詳細レポートを見る"}
          </button>

          {showDetail && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">パーソナリティ分析</p>
                <p className="text-sm text-slate-600 leading-relaxed">{analysis.personality}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">詳細フィードバック</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{analysis.detail}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div>
                  <p className="text-xs font-bold text-orange-500 mb-1">💡 この商談の山場</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysis.critical_point}</p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-blue-500 mb-1">🎯 理想的な立ち回り</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysis.best_approach}</p>
                </div>
              </div>
            </div>
          )}

          {/* ⑥ アクション */}
          <div className="flex gap-3 print:hidden">
            <button onClick={downloadPDF} className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-700 transition-colors text-sm">
              📄 PDFで保存
            </button>
            <button
              onClick={() => { setScreen("setup"); setJd(""); setMessages([]); setChatLogs([]); setRallyCount(0); setAnalysis(null); setSimConfig(null); setError(""); setShowDetail(false); }}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold hover:bg-slate-50 transition-colors text-sm"
            >
              もう一度
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
