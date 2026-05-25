import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !UUID_RE.test(id)) {
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
