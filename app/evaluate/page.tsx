"use client";

import { useState } from "react";
import { SIM_TYPE_LABEL, RECOMMENDATION_COLOR } from "../constants";

function renderBulletText(text: string) {
  const clean = text.replace(/\*\*/g, "").replace(/[\*\_]/g, "");
  const lines = clean.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => {
        const body = line.replace(/^[-・]\s*/, "");
        const colonIdx = body.indexOf("：");
        if (colonIdx > 0 && colonIdx < 20) {
          const label = body.slice(0, colonIdx);
          const desc = body.slice(colonIdx + 1);
          return (
            <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-slate-300 mt-1 flex-shrink-0">•</span>
              <span><span className="font-bold text-slate-800">{label}：</span>{desc}</span>
            </li>
          );
        }
        return (
          <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-slate-300 mt-1 flex-shrink-0">•</span>
            <span>{body}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface EvaluationResult {
  reports: {
    id: string;
    sim_type: string;
    title: string;
    analysis: { scores: number[]; overall: string; hiring_recommendation: string };
    score_labels: string[];
  }[];
  overall: string;
  consistentStrengths: string;
  consistentWeaknesses: string;
  personality: string;
  onboardingScenario: string;
  riskPoints: string;
  reliability: string;
  finalRecommendation: string;
}

function getRecommendationKey(rec: string) {
  for (const key of Object.keys(RECOMMENDATION_COLOR)) {
    if (rec.includes(key)) return key;
  }
  return "要検討";
}

export default function EvaluatePage() {
  const [urls, setUrls] = useState<string[]>(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const extractId = (url: string) => {
    const match = url.match(/\/report\/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  };

  const validCount = urls.map(extractId).filter(Boolean).length;

  const handleEvaluate = async () => {
    setError("");
    const ids = urls.map(extractId).filter(Boolean) as string[];
    if (ids.length < 3) {
      setError("3件以上のレポートURLを入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white px-6 py-1.5 flex justify-between items-center shadow-lg">
        <a href="/" className="font-black tracking-widest text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent hover:opacity-70 transition-opacity">
          TRACE
        </a>
        <div className="text-xs text-slate-400">統合評価</div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* 入力エリア */}
        {!result && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div>
              <h1 className="text-base font-black text-slate-800 mb-1">複数シミュレーション 統合評価</h1>
              <p className="text-xs text-slate-500 leading-relaxed">候補者が受けたシミュレーションのレポートURLを入力してください。3〜4件で統合評価・採用推奨度を生成します。</p>
            </div>

            <div className="space-y-3">
              {urls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      const next = [...urls];
                      next[i] = e.target.value;
                      setUrls(next);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      const lines = pasted.split(/[\n\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                      if (lines.length > 1) {
                        e.preventDefault();
                        const next = [...urls];
                        lines.slice(0, 4).forEach((line, j) => { next[i + j < 4 ? i + j : 3] = line; });
                        setUrls(next);
                      }
                    }}
                    placeholder="https://trace-dev.vercel.app/report/..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleEvaluate}
              disabled={loading || validCount < 3}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-3 font-bold transition-colors text-sm"
            >
              {loading ? "統合評価を生成中..." : validCount < 3 ? `あと${3 - validCount}件必要です` : "統合評価する"}
            </button>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <>
            {/* 受験シミュレーション一覧 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="text-xs font-bold text-slate-400 mb-3">受験シミュレーション</h2>
              <div className="space-y-2">
                {result.reports.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                        {SIM_TYPE_LABEL[r.sim_type] ?? r.sim_type}
                      </span>
                      <span className="text-xs text-slate-600">{r.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      平均 {(r.analysis.scores.reduce((a, b) => a + b, 0) / r.analysis.scores.length).toFixed(1)}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 採用推奨度 */}
            {(() => {
              const recKey = getRecommendationKey(result.finalRecommendation);
              return (
                <div className={`rounded-2xl border-2 p-6 text-center ${RECOMMENDATION_COLOR[recKey]}`}>
                  <p className="text-sm font-bold mb-2 opacity-60">最終採用推奨度</p>
                  <p className="text-5xl font-black mb-4">{recKey}</p>
                  <p className="text-base leading-relaxed">{result.finalRecommendation.replace(/^(強く推奨|推奨|要検討|非推奨)[：:]\s*/, "")}</p>
                </div>
              );
            })()}

            {/* 総合評価・人物像 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-bold text-violet-500 mb-2">総合評価</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.overall}</p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-violet-500 mb-2">人物像</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.personality}</p>
              </div>
            </div>

            {/* 強み・課題 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <p className="text-xs font-bold text-emerald-600 mb-3">✅ 判断の根底にある価値観・強み</p>
                {renderBulletText(result.consistentStrengths)}
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                <p className="text-xs font-bold text-amber-600 mb-3">⚠️ 判断の癖・課題・懸念</p>
                {renderBulletText(result.consistentWeaknesses)}
              </div>
            </div>

            {/* 活躍シナリオ・リスク */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <p className="text-xs font-bold text-emerald-600 mb-2">🚀 入社後の活躍シナリオ</p>
                <p className="text-sm text-slate-600 leading-relaxed">{result.onboardingScenario}</p>
              </div>
              <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                <p className="text-xs font-bold text-red-500 mb-2">⚠️ 懸念点・フォローアップ</p>
                <p className="text-sm text-slate-600 leading-relaxed">{result.riskPoints}</p>
              </div>
            </div>

            {/* 詳細（評価信頼性） */}
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              {showDetail ? "▲ 詳細を閉じる" : "▼ 評価の信頼性を見る"}
            </button>

            {showDetail && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">評価の信頼性</p>
                <p className="text-sm text-slate-600 leading-relaxed">{result.reliability.replace(/\*\*/g, "")}</p>
              </div>
            )}

            <button
              onClick={() => { setResult(null); setUrls(["", "", "", ""]); setShowDetail(false); }}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl py-3 font-semibold transition-colors text-sm"
            >
              別の候補者を評価する
            </button>
          </>
        )}
      </div>
    </div>
  );
}
