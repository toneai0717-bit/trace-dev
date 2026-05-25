import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";
import { checkRateLimit, getClientIp } from "../_ratelimit";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 20, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { aiRole, lastAiMessage, rallyCount, simType = "email", context, playerOrg } = await req.json();

    const isData = simType === "data";
    const isPriority = simType === "priority";
    const isReport = simType === "report";

    const actionInstruction = isData
      ? `- アクションはデータを見て判断したアクションプラン（箇条書き3〜5点、200文字以内）
- 意図はその判断の根拠・狙い（50〜100文字）`
      : isPriority
      ? `- アクションは優先順位と対応方針（各タスクへの対処を箇条書き、200文字以内）
- 意図はその優先順位の判断理由（50〜100文字）`
      : isReport
      ? `- アクションは上司への報告内容（事実→分析→提案の順で、200文字以内）
- 意図はその報告構成の狙い・戦略（50〜100文字）`
      : `- アクションは実際に送るビジネスメール本文（150〜250文字）
- 意図は戦略の説明（50〜100文字）
- ラリー${rallyCount}回目にふさわしい展開（序盤は情報収集、中盤は提案、終盤はクロージング）
${playerOrg ? `- 署名は「${playerOrg}　戸根」の形式で必ずメール末尾に入れること` : `- 署名は「戸根」のみでよい（社名不明の場合）`}`;

    const contextLabel = isData ? "データ状況" : isPriority ? "タスク状況" : isReport ? "報告依頼内容" : `相手（${aiRole}）の直前のメッセージ`;

    const text = await createMessageWithFallback({
      maxTokens: 1024,
      system: `あなたはビジネスシミュレーションのコーチです。
プレイヤーが「${isData || isPriority ? simType : aiRole}」のシミュレーションを行っています。
現在${rallyCount}回目のやり取りです。

直前の状況を踏まえて、プレイヤーが次に取るべき
「アクション」と「狙い・戦略（意図）」のサンプルを1パターン提案してください。

【重要】
${actionInstruction}
- シナリオと状況に合った自然な内容にすること

以下のタグで返してください：
<ACTION>アクション内容</ACTION>
<INTENT>狙い・戦略</INTENT>`,
      userContent: `${contextLabel}：\n${(lastAiMessage ?? "").slice(0, 500)}\n\nシナリオ背景：\n${(context ?? "").slice(0, 500)}`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const action = extract("ACTION");
    const intent = extract("INTENT");

    if (!action || !intent) throw new Error("サンプル生成に失敗しました");

    return NextResponse.json({ action, intent });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サンプルの生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
