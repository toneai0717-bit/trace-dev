import { NextRequest, NextResponse } from "next/server";
import { createChatWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { aiRole, firstMsg, messages, chatLogs, rallyCount, simType = "email" } = await req.json();

    const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];
    let skippedFirst = false;
    for (const msg of messages) {
      if (!skippedFirst && msg.role === "ai") {
        skippedFirst = true;
        continue;
      }
      skippedFirst = true;
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }

    if (claudeMessages.length === 0) {
      const lastAction = chatLogs[chatLogs.length - 1]?.action ?? "";
      claudeMessages.push({ role: "user", content: lastAction });
    }

    const isData = simType === "data";
    const isPriority = simType === "priority";

    const system = isPriority
      ? `あなたは優先順位・タスク管理シミュレーションの進行役です。

【シナリオ概要】
${firstMsg}

現在${rallyCount}回目のやり取りです（最低3回、最大4回）。

【割り込み追加のルール】
- プレイヤーの優先順位判断を受けて、新たな割り込みを1件追加する
- 割り込みは緊急度・重要度がバラバラなものを入れる（すべて緊急にしない）
- 全体で200文字以内に収める
- プレイヤーの判断を評価しない。ただ状況を変化させる
- 最後に「この状況を踏まえて、優先順位を見直しますか？」と1行で問いかける
- 【割り込み発生】というラベルで始める

以下のタグで返してください：
<REPLY>割り込みと問いかけ</REPLY>`
      : isData
      ? `あなたは数字分析シミュレーションの進行役です。

【シナリオ概要】
${firstMsg}

現在${rallyCount}回目のやり取りです（最低3回、最大4回）。

【新情報追加のルール】
- プレイヤーの判断を受けて、状況を変化させる新情報を1〜2件追加する
- 新情報は数値・事実ベースで簡潔に。1件あたり2〜3行以内
- 全体で300文字以内に収める
- プレイヤーの判断が正しかったかどうかは評価しない。ただ状況を変化させる
- 最後に「この新情報を踏まえて、あなたはどう動きますか？」と1行で問いかける
- 【新情報】というラベルで始める

以下のタグで返してください：
<REPLY>新情報と問いかけ</REPLY>`
      : `あなたは「${aiRole}」です。ビジネスの現場でプレイヤーと交渉・対話する相手キャラクターを演じてください。

【キャラクター設定】
- 自社・自部門の利益を最優先するプロフェッショナル
- 感情的にはならないが、不利な条件は明確に断る
- 相手の提案の弱点を突き、より有利な条件を引き出そうとする
- 一方的に押し切られず、粘り強く自分の立場を守る

【会話の流れ】
あなたはこの会話をこのメッセージで始めました：
「${firstMsg}」

現在${rallyCount}回目のやり取りです（最低3回、最大4回）。

【返信のルール】
- ビジネスメール形式（宛名・本文・結び・署名）
- プレイヤーの名前は「戸根」。メール文中の宛名は「戸根様」と書く
- 500文字以内で簡潔かつリアルに
- 前回までの自分の発言と一貫性を保つ
- 相手の意図を読んだ上で戦略的に応答する

以下のタグで返してください：
<REPLY>ビジネスメール本文</REPLY>`;

    const text = await createChatWithFallback({
      system,
      messages: claudeMessages,
      maxTokens: 1024,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const reply = extract("REPLY") || text.trim();
    if (!reply) throw new Error("返信の生成に失敗しました");

    return NextResponse.json({ reply, shouldFinish: false });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
