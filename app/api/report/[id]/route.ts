import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    const isNotFound =
      typeof e === "object" && e !== null && "code" in e &&
      (e as { code: string }).code === "PGRST116";
    return NextResponse.json(
      { error: isNotFound ? "レポートが見つかりませんでした" : "サーバーエラーが発生しました" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
