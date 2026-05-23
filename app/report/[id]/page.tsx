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

export default function ReportPage() {
  const { id } = useParams();
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
      } catch (e) {
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

  const radarData = {
    labels: score_labels,
    datasets: [
      {
        label: "評価スコア",
        data: analysis.scores,
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderColor: "rgba(99, 102, 241, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
      },
    ],
  };

  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2, font: { size: 10 } },
        pointLabels: { font: { size: 11 } },
      },
    },
    plugins: { legend: { display: false } },
  };

  const simTypeLabel =
    report.sim_type === "data" ? "数字分析"
    : report.sim_type === "priority" ? "優先順位"
    : report.sim_type === "report" ? "報告"
    : "メール対応";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-black tracking-tight text-slate-800 hover:opacity-70 transition-opacity">TRACE</a>
        <div className="text-xs text-slate-400">評価レポート</div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* タイトル */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">{simTypeLabel}</span>
          </div>
          <h1 className="text-lg font-black text-slate-800">{report.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{new Date(report.created_at).toLocaleDateString("ja-JP")}</p>
        </div>

        {/* レーダーチャート */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">コンピテンシー評価</h2>
          <div className="max-w-xs mx-auto">
            <Radar data={radarData} options={radarOptions} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {score_labels.map((label, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600">{label}</span>
                <span className="text-sm font-bold text-indigo-600">{analysis.scores[i]}<span className="text-xs text-slate-400">/10</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* 総合評価 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
          <div>
            <h2 className="text-xs font-bold text-violet-500 mb-1">総合評価</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{analysis.overall}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-violet-500 mb-1">人物像</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{analysis.personality}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-violet-500 mb-1">採用推奨度</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{analysis.hiring_recommendation}</p>
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
              {[
                { label: "このシミュレーションの山場", value: analysis.critical_point },
                { label: "詳細分析", value: analysis.detail },
                { label: "最も効果的なアプローチ", value: analysis.best_approach },
                { label: "オンボーディングシナリオ", value: analysis.onboarding_scenario },
                { label: "リスクポイント", value: analysis.risk_points },
                { label: "面接で深掘りすべき質問", value: analysis.interview_questions },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="text-xs font-bold text-violet-500 mb-1">{item.label}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
