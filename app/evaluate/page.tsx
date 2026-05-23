"use client";

import { useState } from "react";

const SIM_TYPE_LABEL: Record<string, string> = {
  email: "メール対応",
  data: "数字分析",
  priority: "優先順位",
  report: "報告",
};

const RECOMMENDATION_COLOR: Record<string, string> = {
  "強く推奨": "bg-emerald-50 border-emerald-400 text-emerald-800",
  "推奨": "bg-blue-50 border-blue-400 text-blue-800",
  "要検討": "bg-amber-50 border-amber-400 text-amber-800",
  "非推奨": "bg-red-50 border-red-400 text-red-800",
};

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
  reliability: string;
  finalRecommendation: string;
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

  const getRecommendationColor = (rec: string) => {
    for (const key of Object.keys(RECOMMENDATION_COLOR)) {
      if (rec.includes(key)) return RECOMMENDATION_COLOR[key];
    }
    return "bg-slate-50 border-slate-300 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-black tracking-tight text-slate-800 hover:opacity-70 transition-opacity">TRACE</a>
        <div className="text-xs text-slate-400">統合評価</div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 入力エリア */}
        {!result && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
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
            <div className="bg-white rounded-2xl p-5 border border-slate-100">
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
            <div className={`rounded-2xl p-5 border-2 ${getRecommendationColor(result.finalRecommendation)}`}>
              <h2 className="text-xs font-bold mb-1 opacity-70">採用推奨度</h2>
              <p className="text-sm font-bold leading-relaxed">{result.finalRecommendation}</p>
            </div>

            {/* 総合評価・人物像 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
              <div>
                <h2 className="text-xs font-bold text-violet-500 mb-1">総合評価</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{result.overall}</p>
              </div>
              <div>
                <h2 className="text-xs font-bold text-violet-500 mb-1">人物像</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{result.personality}</p>
              </div>
            </div>

            {/* 詳細フィードバック */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-slate-700">詳細フィードバック</span>
                <span className="text-slate-400 text-lg">{showDetail ? "▲" : "▼"}</span>
              </button>
              {showDetail && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-500 mb-1">判断の根底にある価値観・強み</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.consistentStrengths}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-500 mb-1">判断の癖・課題・懸念</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.consistentWeaknesses}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 mb-1">評価の信頼性</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{result.reliability}</p>
                  </div>
                </div>
              )}
            </div>

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
