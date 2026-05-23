import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { simType, title, context, analysis, scoreLabels, chatLogs } = await req.json();

    const { data, error } = await supabase
      .from("reports")
      .insert({
        sim_type: simType,
        title,
        context,
        analysis,
        score_labels: scoreLabels,
        chat_logs: chatLogs,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
