import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { checkRateLimit, getClientIp } from "../_ratelimit";

const VALID_SIM_TYPES = ["email", "data", "priority", "report"] as const;
type SimType = typeof VALID_SIM_TYPES[number];

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(getClientIp(req), 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "リクエストが多すぎます。少し待ってから再試行してください。" }, { status: 429 });

  try {
    const { simType, title, context, analysis, scoreLabels, chatLogs } = await req.json();

    // バリデーション
    if (!VALID_SIM_TYPES.includes(simType as SimType)) {
      return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "タイトルが不正です" }, { status: 400 });
    }
    if (!analysis || typeof analysis !== "object" || !Array.isArray(analysis.scores)) {
      return NextResponse.json({ error: "分析データが不正です" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        sim_type: simType,
        title: String(title).slice(0, 100),
        context,
        analysis,
        score_labels: Array.isArray(scoreLabels) ? scoreLabels.slice(0, 10) : [],
        chat_logs: Array.isArray(chatLogs) ? chatLogs.slice(0, 20) : [],
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "レポートの保存に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
