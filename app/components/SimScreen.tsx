"use client";

import React from "react";
import DOMPurify from "dompurify";
import { useMemo } from "react";
import { SimConfig, AnalysisResult, Screen } from "../types";

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| :]+\|/)) {
      const headers = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(h => h.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));
        i++;
      }
      result.push(
        <div key={i} className="overflow-x-auto my-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>{headers.map((h, j) => <th key={j} className="border border-slate-300 bg-slate-100 px-2 py-1 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {row.map((cell, ci) => <td key={ci} className="border border-slate-200 px-2 py-1">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (line.trim() === "---") {
      result.push(<hr key={i} className="border-slate-200 my-2" />);
      i++;
    } else if (line.trim() === "") {
      result.push(<div key={i} className="h-2" />);
      i++;
    } else if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(line.trim()) || (line.includes("【") && line.includes("】") && !line.startsWith("　"))) {
      result.push(
        <p key={i} className="font-semibold text-slate-800 mt-3 mb-1">
          {parseBold(line)}
        </p>
      );
      i++;
    } else {
      result.push(
        <p key={i} className="text-slate-700 leading-relaxed">
          {parseBold(line)}
        </p>
      );
      i++;
    }
  }
  return result;
}

interface SimScreenProps {
  simConfig: SimConfig;
  simType: "email" | "data" | "priority" | "report";
  messages: { role: "ai" | "user"; text: string; intent?: string }[];
  action: string;
  setAction: (v: string) => void;
  intent: string;
  setIntent: (v: string) => void;
  rallyCount: number;
  error: string;
  loading: boolean;
  loadingMsg: string;
  suggesting: boolean;
  setSuggesting: (v: boolean) => void;
  chatTab: "sim" | "boss";
  setChatTab: (v: "sim" | "boss") => void;
  showContext: boolean;
  setShowContext: (v: boolean) => void;
  consultQuestion: string;
  setConsultQuestion: (v: string) => void;
  consultLoading: boolean;
  consultLogs: { role: "boss"; question: string; reply: string }[];
  analysis: AnalysisResult | null;
  setScreen: (s: Screen) => void;
  onSendRally: () => void;
  onConsult: () => void;
  showToast: (msg: string) => void;
  chatRef: React.RefObject<HTMLDivElement | null>;
  lastAiMsgRef: React.RefObject<HTMLDivElement | null>;
}

export default function SimScreen({
  simConfig, simType, messages,
  action, setAction, intent, setIntent,
  rallyCount, error, loading, loadingMsg,
  suggesting, setSuggesting,
  chatTab, setChatTab, showContext, setShowContext,
  consultQuestion, setConsultQuestion, consultLoading, consultLogs,
  analysis, setScreen, onSendRally, onConsult, showToast,
  chatRef, lastAiMsgRef,
}: SimScreenProps) {
  const safeContext = useMemo(() => {
    if (typeof window === "undefined" || !simConfig.context) return simConfig.context;
    return DOMPurify.sanitize(simConfig.context, { ALLOWED_TAGS: ["ul", "li", "p", "span"], ALLOWED_ATTR: ["class"] });
  }, [simConfig.context]);

  const actionLabel = simType === "data" ? "アクションプラン" : simType === "priority" ? "優先順位と対応方針" : simType === "report" ? "報告内容" : "返信内容（アクション）";
  const actionPlaceholder = simType === "data" ? "アクションプランを書いてください..." : simType === "priority" ? "何をどの順番でやるか書いてください..." : simType === "report" ? "報告内容を書いてください..." : "相手へのメッセージを書いてください...";
  const intentPlaceholder = simType === "data" ? "このアクションの狙いを書いてください..." : simType === "priority" ? "なぜその順番にしたか書いてください..." : simType === "report" ? "なぜその伝え方にしたか書いてください..." : "このメッセージの狙いを書いてください...";
  const chatTabLabel = simType === "data" ? "データ確認" : simType === "priority" ? "タスク状況" : simType === "report" ? "報告ログ" : "交渉チャット";

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-5 h-[calc(100dvh-44px)] p-3 md:p-5">
      {/* Context: PC=左カラム固定 / SP=トグル */}
      <div className="md:w-52 md:flex-shrink-0 flex flex-col">
        <button
          onClick={() => setShowContext(!showContext)}
          className="md:hidden flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-blue-600 shadow-sm mb-2"
        >
          <span>📋 {simConfig.title}</span>
          <span>{showContext ? "▲ 閉じる" : "▼ シナリオ確認"}</span>
        </button>
        <div className={`${showContext ? "block" : "hidden"} md:block bg-white rounded-2xl border border-slate-100 px-3 py-4 overflow-y-auto shadow-sm flex-1`}>
          <h3 className="font-bold text-blue-600 text-xs mb-3 hidden md:block leading-snug">{simConfig.title}</h3>
          <div
            className="text-[11px] text-slate-600 leading-relaxed space-y-2 [&_.label]:font-bold [&_.label]:text-slate-700 [&_p]:leading-snug"
            dangerouslySetInnerHTML={{ __html: safeContext }}
          />
        </div>
      </div>

      {/* Right: chat */}
      <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
        <div className="flex gap-2">
          <button
            onClick={() => setChatTab("sim")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${chatTab === "sim" ? "bg-sky-500 text-white" : "bg-white border border-sky-200 text-sky-500 hover:bg-sky-50"}`}
          >
            {chatTabLabel}
          </button>
          <button
            onClick={() => setChatTab("boss")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${chatTab === "boss" ? "bg-sky-500 text-white" : "bg-white border border-sky-200 text-sky-500 hover:bg-sky-50"}`}
          >
            上司に相談 {consultLogs.length > 0 && <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{consultLogs.length}</span>}
          </button>
        </div>

        {chatTab === "sim" && (
          <>
            <div ref={chatRef} className="flex-1 bg-white rounded-2xl border border-slate-100 p-5 overflow-y-auto shadow-sm flex flex-col gap-4">
              {messages.map((msg, i) => {
                const isLastAi = msg.role === "ai" && messages.slice(i + 1).every(m => m.role !== "ai");
                return (
                  <div key={i} ref={isLastAi ? lastAiMsgRef : null} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`${msg.role === "ai" && (simType === "data" || simType === "priority" || simType === "report") ? "w-full" : "max-w-[80%]"} rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "ai"
                        ? "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm"
                        : "bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap"
                    }`}>
                      {msg.role === "ai" && (simType === "data" || simType === "priority" || simType === "report") ? renderMarkdown(msg.text) : msg.text}
                      {msg.intent && (
                        <span className="block text-xs mt-2 pt-2 border-t border-white/20 text-blue-100 italic">
                          戦略: {msg.intent}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex justify-end mb-2">
                <button
                  onClick={async () => {
                    if (suggesting || !simConfig) return;
                    setSuggesting(true);
                    try {
                      const lastAiMsg = [...messages].reverse().find(m => m.role === "ai")?.text ?? "";
                      const res = await fetch("/api/suggest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          aiRole: simConfig.aiRole,
                          lastAiMessage: lastAiMsg,
                          targetPersona: simConfig.targetPersona,
                          context: simConfig.context,
                        }),
                      });
                      const data = await res.json();
                      if (data.action) setAction(data.action);
                      if (data.intent) setIntent(data.intent);
                    } catch {
                      showToast("サンプル生成に失敗しました");
                    } finally {
                      setSuggesting(false);
                    }
                  }}
                  disabled={suggesting}
                  className="text-xs text-slate-400 hover:text-blue-500 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {suggesting ? "生成中..." : "💡 AI提案"}
                </button>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1">{actionLabel}</label>
                  <textarea
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder={actionPlaceholder}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-violet-400 mb-1">狙い・戦略（意図）</label>
                  <textarea
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    rows={3}
                    className="w-full border border-violet-200 bg-violet-50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-400 transition-colors"
                    placeholder={intentPlaceholder}
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                onClick={onSendRally}
                disabled={!action.trim() || !intent.trim()}
                className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                送信する
              </button>
            </div>
          </>
        )}

        {chatTab === "boss" && (
          <>
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-5 overflow-y-auto shadow-sm flex flex-col gap-4">
              {consultLogs.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-sm font-semibold text-slate-600">上司に相談する</p>
                </div>
              )}
              {consultLogs.map((log, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] whitespace-pre-wrap">{log.question}</div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%] whitespace-pre-wrap text-slate-700">{log.reply}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <textarea
                value={consultQuestion}
                onChange={(e) => setConsultQuestion(e.target.value)}
                rows={3}
                placeholder=""
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors mb-3"
              />
              <button
                onClick={onConsult}
                disabled={!consultQuestion.trim() || consultLoading}
                className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-400 disabled:opacity-30 transition-colors"
              >
                {consultLoading ? "返答を待っています..." : "送信する"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
