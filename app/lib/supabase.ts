import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY) are not set");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
