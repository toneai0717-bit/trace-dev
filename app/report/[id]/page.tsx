"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { SIM_TYPE_LABEL, RECOMMENDATION_COLOR } from "../../constants";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface Report {
  sim_type: string;
  title: string;
  context: string;
  analysis: {
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
  };
  score_labels: string[];
  chat_logs: { action: string; intent: string }[];
  created_at: string;
}

function getRecommendationKey(rec: string) {
  for (const key of Object.keys(RECOMMENDATION_COLOR)) {
    if (rec.includes(key)) return key;
  }
  return "要検討";
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setReport(data);
      } catch {
        setError("レポートが見つかりませんでした。");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">レポートを読み込み中...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const { analysis, score_labels } = report;
  const recKey = getRecommendationKey(analysis.hiring_recommendation);
  const simTypeLabel = SIM_TYPE_LABEL[report.sim_type] ?? "メール対応";

  const radarData = {
    labels: score_labels,
    datasets: [{
      label: "評価スコア",
      data: analysis.scores,
      backgroundColor: "rgba(99, 102, 241, 0.15)",
      borderColor: "rgba(99, 102, 241, 0.8)",
      borderWidth: 2,
      pointBackgroundColor: "rgba(99, 102, 241, 1)",
    }],
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white px-6 py-1.5 flex justify-between items-center shadow-lg">
        <a href="/" className="font-black tracking-widest text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent hover:opacity-70 transition-opacity">
          TRACE
        </a>
        <div className="text-xs text-slate-400">評価レポート</div>
      </header>

      {/* シミュレーション情報 */}
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">{simTypeLabel}</span>
          <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString("ja-JP")}</span>
        </div>
        <h1 className="text-lg font-black text-slate-800 mb-4">{report.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">

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
              {score_labels.map((label, i) => (
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

        {/* PDF保存 */}
        <div className="print:hidden">
          <button
            onClick={() => window.print()}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
          >
            PDFで保存
          </button>
        </div>

      </div>
    </div>
  );
}
