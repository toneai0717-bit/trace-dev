"use client";

import { useState, useRef, useEffect } from "react";
import { track } from "@vercel/analytics";
import { Screen, SimConfig, ChatLog, AnalysisResult } from "./types";
import TopScreen from "./components/TopScreen";
import SetupScreen from "./components/SetupScreen";
import SimScreen from "./components/SimScreen";
import ResultScreen from "./components/ResultScreen";

const DEFAULT_SCORE_LABELS = ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"];
const DRAFT_ACTION_KEY = "trace_draft_action";
const DRAFT_INTENT_KEY = "trace_draft_intent";

const DEFAULT_JD = `《兵庫県洲本市》蓄電バッテリーパック部材の購買業務【PEC　エナジーソリューション事業部】
500万円〜700万円
購買・資材調達

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
・冷静な分析力と大胆な判断が取れる`;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("top");
  const [jd, setJd] = useState(DEFAULT_JD);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const isSubmittingRef = useRef(false);
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
  const [simType, setSimType] = useState<"email" | "data" | "priority" | "report">("email");
  const [toast, setToast] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [chatTab, setChatTab] = useState<"sim" | "boss">("sim");
  const [consultQuestion, setConsultQuestion] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  // rallyAtは情報取得タイミングの記録。評価AIが「いつ取得したか」を判断できるよう付与する。
  const [consultLogs, setConsultLogs] = useState<import("./types").ConsultLog[]>([]);
  const [reportUrl, setReportUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [finishFailed, setFinishFailed] = useState(false);
  const finishLogsRef = useRef<ChatLog[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastAiMsgRef = useRef<HTMLDivElement>(null);

  // ドラフト自動保存
  useEffect(() => {
    if (screen !== "sim") return;
    localStorage.setItem(DRAFT_ACTION_KEY, action);
  }, [action, screen]);

  useEffect(() => {
    if (screen !== "sim") return;
    localStorage.setItem(DRAFT_INTENT_KEY, intent);
  }, [intent, screen]);

  // sim画面に入ったときにドラフト復元
  useEffect(() => {
    if (screen !== "sim") return;
    if (!action) {
      const saved = localStorage.getItem(DRAFT_ACTION_KEY);
      if (saved) setAction(saved);
    }
    if (!intent) {
      const saved = localStorage.getItem(DRAFT_INTENT_KEY);
      if (saved) setIntent(saved);
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lastAiMsgRef.current && chatRef.current) {
      const container = chatRef.current;
      const el = lastAiMsgRef.current;
      container.scrollTop = el.offsetTop - container.offsetTop - 16;
    } else if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  async function initSimulation() {
    if (jd.trim().length < 10) return;
    setLoading(true);
    setLoadingMsg("シナリオを生成中...");
    setError("");
    try {
      const res = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, simType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "シナリオの生成に失敗しました。もう一度お試しください。");
        return;
      }
      setSimConfig(data);
      setMessages([{ role: "ai", text: data.firstMsg }]);
      setChatLogs([]);
      setRallyCount(0);
      setAnalysis(null);
      setError("");
      setShowDetail(false);
      setReportUrl("");
      setUrlCopied(false);
      localStorage.removeItem(DRAFT_ACTION_KEY);
      localStorage.removeItem(DRAFT_INTENT_KEY);
      setAction("");
      setIntent("");
      setChatTab("sim");
      setConsultLogs([]);
      setConsultQuestion("");
      setSuggesting(false);
      setFinishFailed(false);
      finishLogsRef.current = [];
      setScreen("sim");
    } catch (e) {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function consultColleague() {
    if (!consultQuestion.trim() || !simConfig) return;
    const role: "boss" = "boss";
    setConsultLoading(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          question: consultQuestion,
          simContext: simConfig.context,
          aiRole: simConfig.aiRole,
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) {
        showToast("相談に失敗しました。もう一度お試しください。");
        return;
      }
      setConsultLogs(prev => [...prev, { role, question: consultQuestion, reply: data.reply, rallyAt: rallyCount }]);
      setConsultQuestion("");
    } catch {
      showToast("通信エラーが発生しました");
    } finally {
      setConsultLoading(false);
    }
  }

  async function processRally() {
    if (isSubmittingRef.current || !action.trim() || !intent.trim() || !simConfig) return;
    isSubmittingRef.current = true;

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
    setLoadingMsg(simType === "data" ? "次の情報を取得中..." : simType === "priority" ? "状況を更新中..." : simType === "report" ? "上司が確認中..." : "相手が返信を作成中...");

    let rallySucceeded = false;

    try {
      const res = await fetch("/api/rally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiRole: simConfig.aiRole,
          firstMsg: simConfig.firstMsg,
          context: simConfig.context,
          messages: newMessages,
          chatLogs: newLogs,
          rallyCount: newCount,
          simType,
          playerOrg: simConfig.playerOrg,
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
      rallySucceeded = true;

      if (newCount >= 4) {
        finishLogsRef.current = newLogs;
        await finishSimulation(newLogs);
      } else {
        setLoading(false);
      }
    } catch (e) {
      if (rallySucceeded) {
        // rally は成功したが finishSimulation が失敗 → 入力を復元せず再試行ボタンを表示
        setFinishFailed(true);
        showToast("評価レポートの生成に失敗しました。再試行してください。");
      } else {
        // rally 自体が失敗 → 入力を復元してリトライ可能にする
        showToast("通信エラーが発生しました。もう一度お試しください。");
        setAction(savedAction);
        setIntent(savedIntent);
      }
      setLoading(false);
    } finally {
      isSubmittingRef.current = false;
    }
  }

  async function retryFinish() {
    if (!finishLogsRef.current.length) return;
    setFinishFailed(false);
    setLoading(true);
    setLoadingMsg("評価レポートを生成中...");
    try {
      await finishSimulation(finishLogsRef.current);
    } catch {
      setFinishFailed(true);
      showToast("評価レポートの生成に失敗しました。再試行してください。");
    }
  }

  // finishSimulation はエラーを呼び出し元（processRally）に伝播させる
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
          consultLogs,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "評価レポートの生成に失敗しました");
      }

      track("simulation_completed");
      setAnalysis(data);
      setScreen("result");
      setReportUrl("");
      setUrlCopied(false);
      localStorage.removeItem(DRAFT_ACTION_KEY);
      localStorage.removeItem(DRAFT_INTENT_KEY);
    } finally {
      setLoading(false);
    }
  }

  function resetSimulation() {
    setScreen("setup");
    setJd("");
    setMessages([]);
    setChatLogs([]);
    setRallyCount(0);
    setAnalysis(null);
    setSimConfig(null);
    setError("");
    setShowDetail(false);
    setReportUrl("");
    setUrlCopied(false);
    setAction("");
    setIntent("");
    setChatTab("sim");
    setConsultLogs([]);
    setConsultQuestion("");
    setSuggesting(false);
    setFinishFailed(false);
    finishLogsRef.current = [];
    localStorage.removeItem(DRAFT_ACTION_KEY);
    localStorage.removeItem(DRAFT_INTENT_KEY);
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
    setReportUrl("");
    setUrlCopied(false);
  }

  const scoreLabels = simConfig?.scoreLabels ?? DEFAULT_SCORE_LABELS;

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
        <div className="flex items-center gap-3">
          {screen === "sim" && analysis && (
            <button
              onClick={() => setScreen("result")}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold"
            >
              評価レポートへ →
            </button>
          )}
          {screen === "top" && (
            <a
              href="/evaluate"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-semibold"
            >
              統合評価
            </a>
          )}
          <div className="text-xs text-slate-400">
            {(screen === "top" || screen === "setup") && "仕事シミュレーション採用"}
            {screen === "sim" && `やり取り ${rallyCount} / 4回`}
            {screen === "result" && "評価レポート"}
          </div>
        </div>
      </header>

      {screen === "top" && (
        <TopScreen setScreen={setScreen} loadDebug={loadDebug} />
      )}

      {screen === "setup" && (
        <SetupScreen
          jd={jd} setJd={setJd}
          selectedJob={selectedJob} setSelectedJob={setSelectedJob}
          simType={simType} setSimType={setSimType}
          loading={loading} error={error}
          onStart={initSimulation}
        />
      )}

      {screen === "sim" && simConfig && (
        <SimScreen
          simConfig={simConfig}
          simType={simType}
          messages={messages}
          action={action} setAction={setAction}
          intent={intent} setIntent={setIntent}
          rallyCount={rallyCount}
          error={error}
          loading={loading} loadingMsg={loadingMsg}
          suggesting={suggesting} setSuggesting={setSuggesting}
          chatTab={chatTab} setChatTab={setChatTab}
          showContext={showContext} setShowContext={setShowContext}
          consultQuestion={consultQuestion} setConsultQuestion={setConsultQuestion}
          consultLoading={consultLoading}
          consultLogs={consultLogs}
          analysis={analysis}
          setScreen={setScreen}
          onSendRally={processRally}
          onConsult={consultColleague}
          showToast={showToast}
          chatRef={chatRef}
          lastAiMsgRef={lastAiMsgRef}
          finishFailed={finishFailed}
          onRetryFinish={retryFinish}
        />
      )}

      {screen === "result" && analysis && (
        <ResultScreen
          analysis={analysis}
          simConfig={simConfig}
          simType={simType}
          scoreLabels={scoreLabels}
          showDetail={showDetail} setShowDetail={setShowDetail}
          reportUrl={reportUrl} urlCopied={urlCopied} savingReport={savingReport}
          setReportUrl={setReportUrl} setUrlCopied={setUrlCopied} setSavingReport={setSavingReport}
          setScreen={setScreen}
          chatLogs={chatLogs}
          onReset={resetSimulation}
          showToast={showToast}
        />
      )}
    </div>
  );
}
