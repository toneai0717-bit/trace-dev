"use client";

import { Screen } from "../types";

interface TopScreenProps {
  setScreen: (s: Screen) => void;
  loadDebug: () => void;
}

export default function TopScreen({ setScreen, loadDebug }: TopScreenProps) {
  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-900 text-white">

      {/* Hero */}
      <div className="flex flex-col items-center text-center px-8 md:px-16 py-20 md:py-28 max-w-4xl mx-auto w-full">
        <p className="text-xs tracking-widest text-blue-400 uppercase mb-4">Next Generation Hiring</p>
        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight pl-6">
          <span className="block">SPIでは測れない、</span>
          <span className="block">
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">本物の仕事力</span>を見抜く。
          </span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed mb-10">
          求人票を貼るだけで、AIがリアルな業務シナリオを生成。<br />
          候補者が実際にどう動くかを、採用前に確かめる。
        </p>
        <button
          onClick={() => setScreen("setup")}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-12 py-4 rounded-2xl text-sm transition-colors"
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
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="9" y1="12" x2="15" y2="12"/>
                  </svg>
                ),
                title: "業務と無関係",
                desc: "言語・非言語の問題と、実際の仕事能力は別物。採用後にミスマッチが起きる。",
              },
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
        <p className="text-white font-black text-3xl md:text-5xl leading-tight mb-14 pl-6">
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

      {/* 比較表 */}
      <div className="bg-slate-900 px-6 py-16 border-t border-slate-700">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs tracking-widest text-blue-400 uppercase mb-8">Why TRACE</p>
          <h2 className="text-2xl font-bold text-center mb-10">従来の採用手法との違い</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs w-2/5"></th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">SPI</th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">面接</th>
                  <th className="py-3 px-4 text-blue-400 font-bold text-xs text-center">TRACE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "対策できるか", spi: "できる", interview: "できる", trace: "できない" },
                  { label: "業務との関連性", spi: "低い", interview: "低い", trace: "高い" },
                  { label: "思考プロセスが見えるか", spi: "見えない", interview: "担当者次第", trace: "見える" },
                  { label: "取り繕えるか", spi: "—", interview: "取り繕える", trace: "取り繕えない" },
                  { label: "評価の均質性", spi: "高い", interview: "属人的", trace: "高い" },
                  { label: "ミスマッチリスク", spi: "高い", interview: "高い", trace: "低い" },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-800/50" : ""}>
                    <td className="py-3 px-4 text-slate-300 text-xs">{row.label}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs text-center">{row.spi}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs text-center">{row.interview}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-blue-400 font-bold text-xs">{row.trace}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}
