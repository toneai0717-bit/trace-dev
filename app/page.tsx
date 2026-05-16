"use client";

import { useState, useRef, useEffect } from "react";
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
}

const SCORE_LABELS = ["論理思考力", "交渉力", "状況適応力", "主体性", "ストレス耐性"];

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
  const chatRef = useRef<HTMLDivElement>(null);

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

    const res = await fetch("/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jd }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSimConfig(data);
    setMessages([{ role: "ai", text: data.firstMsg }]);
    setScreen("sim");
    setLoading(false);
  }

  async function processRally() {
    if (!action.trim() || !intent.trim() || !simConfig) return;

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

    const res = await fetch("/api/rally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiRole: simConfig.aiRole,
        chatLogs: newLogs,
        rallyCount: newCount,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setMessages([...newMessages, { role: "ai", text: data.reply }]);

    if (data.shouldFinish || newCount >= 6) {
      await finishSimulation(newLogs);
    } else {
      setLoading(false);
    }
  }

  async function finishSimulation(logs: ChatLog[]) {
    setLoadingMsg("評価レポートを生成中...");

    const res = await fetch("/api/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatLogs: logs,
        targetPersona: simConfig?.targetPersona ?? "",
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setAnalysis(data);
    setScreen("result");
    setLoading(false);
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
    });
    setSimConfig({
      title: "バッテリー部材 納期・価格交渉",
      context: "<ul><li>発注数量：月産5,000個 → 7,500個に増産要請</li><li>現行単価：¥2,800/個、目標：¥2,500以下</li><li>納期：現行6週間 → 4週間に短縮要請</li><li>ミッション：増産・コスト削減・納期短縮を同時に達成せよ</li></ul>",
      aiRole: "田中部長 / 中堅サプライヤー株式会社アルファテック 営業部長",
      targetPersona: "サプライヤーと良好な関係を維持しながら、コスト・納期・品質の3軸を同時に交渉できる購買のプロ。",
      firstMsg: "お世話になっております。アルファテックの田中です。\n先日ご連絡いただいた増産のご要望の件で、一度詳しくお話しできればと思いご連絡しました。\n弊社としても前向きに検討したいのですが、現状の生産ラインの制約もありまして…。\nまずは現状をご確認いただけますでしょうか。",
    });
    setScreen("result");
  }

  function getRecommendationKey(rec: string) {
    for (const key of Object.keys(RECOMMENDATION_COLOR)) {
      if (rec.includes(key)) return key;
    }
    return "要検討";
  }

  const radarData = analysis
    ? {
        labels: SCORE_LABELS,
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

      {/* Header */}
      <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg">
        <div className="font-black tracking-widest text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          TRACE
        </div>
        <div className="text-xs text-slate-400">
          {screen === "top" && "仕事シミュレーション採用"}
          {screen === "setup" && "仕事シミュレーション採用"}
          {screen === "sim" && `Rally ${rallyCount} / 最大6`}
          {screen === "result" && "評価レポート"}
        </div>
      </header>

      {/* Top / Landing screen */}
      {screen === "top" && (
        <div className="min-h-[calc(100vh-56px)] bg-slate-900 text-white">

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
              <h2 className="text-2xl font-bold text-center mb-10">SPIは、仕事ができる人を選べない。</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: "📚", title: "対策で突破できる", desc: "SPIは暗記と練習で点数が上がる。本来の能力を測れていない。" },
                  { icon: "❓", title: "業務と無関係", desc: "言語・非言語の問題と、実際の仕事能力は別物。採用後にミスマッチが起きる。" },
                  { icon: "😤", title: "受ける側も嫌い", desc: "意味を感じられないテストに優秀な候補者ほど嫌気がさしている。" },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-700/50 rounded-2xl p-5">
                    <p className="text-2xl mb-3">{item.icon}</p>
                    <p className="font-bold text-sm mb-2">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TRACEの仕組み */}
          <div className="px-6 py-16">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-xs tracking-widest text-blue-400 uppercase mb-8">How it works</p>
              <h2 className="text-2xl font-bold text-center mb-10">3ステップで、採用精度が上がる。</h2>
              <div className="space-y-4">
                {[
                  { step: "01", title: "求人票を貼るだけ", desc: "JDをペーストすると、AIがその職種に合わせたリアルな業務シナリオを自動生成。営業なら商談、企画なら提案交渉など、仕事の現場そのままのシナリオが作られる。" },
                  { step: "02", title: "候補者がシナリオに挑戦", desc: "候補者はAIが演じる取引先・上司・顧客と実際に会話する。返答内容だけでなく、その狙いや戦略まで入力することで思考プロセスまで可視化される。" },
                  { step: "03", title: "AIが即座に評価レポートを生成", desc: "論理思考力・交渉力・状況適応力・主体性・ストレス耐性の5軸でスコアリング。採用推奨度と詳細な所見レポートを即座に出力する。" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 bg-slate-800/50 rounded-2xl p-5">
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
            <h2 className="text-2xl font-bold mb-4">まず、試してみてください。</h2>
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
            <p className="text-sm text-slate-500 mb-6">求人票を貼り付けると、AIがリアルな商談シナリオを生成します。</p>
            <label className="block text-xs font-bold text-slate-500 mb-1">求人票（JD）</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={10}
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
        <div className="flex flex-col md:flex-row gap-3 md:gap-5 h-[calc(100dvh-56px)] p-3 md:p-5">
          {/* Context: PC=左カラム固定 / SP=トグル */}
          <div className="md:w-80 md:flex-shrink-0 flex flex-col">
            {/* SPのトグルボタン */}
            <button
              onClick={() => setShowContext(!showContext)}
              className="md:hidden flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-blue-600 shadow-sm mb-2"
            >
              <span>📋 {simConfig.title}</span>
              <span>{showContext ? "▲ 閉じる" : "▼ シナリオ確認"}</span>
            </button>
            {/* コンテキスト本体 */}
            <div className={`${showContext ? "block" : "hidden"} md:block bg-white rounded-2xl border border-slate-100 p-5 overflow-y-auto shadow-sm flex-1`}>
              <h3 className="font-bold text-blue-600 text-sm mb-3 hidden md:block">{simConfig.title}</h3>
              <div
                className="text-xs text-slate-600 leading-relaxed [&_h3]:font-bold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:pl-4 [&_li]:mb-1 [&_table]:text-xs [&_td]:p-2"
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
        <div className="max-w-5xl mx-auto p-6 print:p-0">
          <div className="flex gap-6 print:gap-4">
            {/* Left: chart + personality */}
            <div className="w-72 flex-shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="font-bold text-slate-700 text-sm mb-4 text-center">スコア分析</h3>
                {radarData && (
                  <Radar
                    data={radarData}
                    options={{
                      scales: {
                        r: {
                          min: 0,
                          max: 10,
                          ticks: { display: false, stepSize: 2 },
                          grid: { color: "#e2e8f0" },
                          pointLabels: { font: { size: 11 } },
                        },
                      },
                      plugins: { legend: { display: false } },
                    }}
                  />
                )}
                <div className="mt-4 space-y-2">
                  {SCORE_LABELS.map((label, i) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${(analysis.scores[i] / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 w-6 text-right">{analysis.scores[i]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hiring recommendation */}
              <div className={`rounded-2xl border-l-4 p-4 text-sm ${RECOMMENDATION_COLOR[getRecommendationKey(analysis.hiring_recommendation)]}`}>
                <p className="font-bold text-xs mb-1">採用推奨度</p>
                <p className="leading-relaxed">{analysis.hiring_recommendation}</p>
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                <p className="font-bold text-xs text-blue-600 mb-2">パーソナリティ分析</p>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.personality}</p>
              </div>
            </div>

            {/* Right: report */}
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-1">エグゼクティブ・レポート</h2>
                <p className="text-sm text-slate-500 mb-4">{analysis.overall}</p>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {analysis.detail}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="space-y-4">
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

              <div className="flex gap-3 print:hidden">
                <button
                  onClick={downloadPDF}
                  className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-700 transition-colors text-sm"
                >
                  📄 PDFで保存
                </button>
                <button
                  onClick={() => {
                    setScreen("setup");
                    setJd("");
                    setMessages([]);
                    setChatLogs([]);
                    setRallyCount(0);
                    setAnalysis(null);
                    setSimConfig(null);
                    setError("");
                  }}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold hover:bg-slate-50 transition-colors text-sm"
                >
                  もう一度シミュレーション
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
