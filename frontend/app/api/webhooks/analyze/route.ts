import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { job_id, status, result, error } = payload;

    if (!job_id) {
      return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (status === "completed") {
      const { error: dbError } = await supabase
        .from("user_history")
        .update({ result })
        .eq("session_id", job_id);

      if (dbError) {
        console.error("Webhook update error:", dbError);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    } else if (status === "error") {
      // Store the error inside the result column to avoid schema changes
      const { error: dbError } = await supabase
        .from("user_history")
        .update({ result: { is_error: true, message: error } })
        .eq("session_id", job_id);

      if (dbError) {
        console.error("Webhook update error:", dbError);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
