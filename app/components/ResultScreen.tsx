"use client";

import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { SimConfig, AnalysisResult, ChatLog, Screen } from "../types";
import { RECOMMENDATION_COLOR } from "../constants";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface ResultScreenProps {
  analysis: AnalysisResult;
  simConfig: SimConfig | null;
  simType: string;
  scoreLabels: string[];
  showDetail: boolean;
  setShowDetail: (v: boolean) => void;
  reportUrl: string;
  urlCopied: boolean;
  savingReport: boolean;
  setReportUrl: (v: string) => void;
  setUrlCopied: (v: boolean) => void;
  setSavingReport: (v: boolean) => void;
  setScreen: (s: Screen) => void;
  chatLogs: ChatLog[];
  onReset: () => void;
  showToast: (msg: string) => void;
}

export default function ResultScreen({
  analysis, simConfig, simType, scoreLabels,
  showDetail, setShowDetail,
  reportUrl, urlCopied, savingReport,
  setReportUrl, setUrlCopied, setSavingReport,
  setScreen, chatLogs, onReset, showToast,
}: ResultScreenProps) {
  const radarData = {
    labels: scoreLabels,
    datasets: [{
      label: "評価スコア",
      data: analysis.scores,
      backgroundColor: "rgba(99, 102, 241, 0.15)",
      borderColor: "rgba(99, 102, 241, 0.8)",
      borderWidth: 2,
      pointBackgroundColor: "rgba(99, 102, 241, 1)",
    }],
  };

  function getRecommendationKey(rec: string) {
    for (const key of Object.keys(RECOMMENDATION_COLOR)) {
      if (rec.includes(key)) return key;
    }
    return "要検討";
  }

  const recKey = getRecommendationKey(analysis.hiring_recommendation);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

      {/* スコア */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-base font-bold text-slate-600 mb-3 text-center">評価スコア</p>
        <div className="flex flex-col gap-4 items-center">
          <div className="w-56 flex-shrink-0">
            <Radar data={radarData} options={{
              scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: "#e2e8f0" }, pointLabels: { font: { size: 9 }, color: "#64748b" } } },
              plugins: { legend: { display: false } },
            }} />
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

      {/* 採用推奨度 */}
      <div className={`rounded-2xl border-2 p-6 text-center ${RECOMMENDATION_COLOR[recKey]}`}>
        <p className="text-sm font-bold mb-2 opacity-60">採用推奨度</p>
        <p className="text-5xl font-black mb-4">{recKey}</p>
        <p className="text-base leading-relaxed">{analysis.overall}</p>
      </div>

      {/* 活躍シナリオ・懸念点 */}
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

      {/* 面接で確認すべき質問 */}
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

      {/* 詳細レポート */}
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
              <p className="text-xs font-bold text-orange-500 mb-1">💡 このシミュレーションの山場</p>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.critical_point}</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-blue-500 mb-1">🎯 理想的な立ち回り</p>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.best_approach}</p>
            </div>
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-semibold transition-colors text-sm">
          PDFで保存
        </button>
        <button
          onClick={() => setScreen("sim")}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          やり取りを確認
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          もう一度
        </button>
      </div>

      {/* URL発行 */}
      <div className="mt-3">
        {!reportUrl ? (
          <button
            onClick={async () => {
              setSavingReport(true);
              try {
                const res = await fetch("/api/save-report", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    simType,
                    title: simConfig?.title,
                    context: simConfig?.context,
                    analysis,
                    scoreLabels: simConfig?.scoreLabels,
                    chatLogs,
                  }),
                });
                const data = await res.json();
                if (data.id) {
                  setReportUrl(`${window.location.origin}/report/${data.id}`);
                }
              } catch {
                showToast("URL発行に失敗しました");
              } finally {
                setSavingReport(false);
              }
            }}
            disabled={savingReport}
            className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-300 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
          >
            {savingReport ? "発行中..." : "🔗 共有URLを発行する"}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={reportUrl}
              readOnly
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 bg-slate-50"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(reportUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }}
              className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors"
            >
              {urlCopied ? "✓ コピー" : "コピー"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
