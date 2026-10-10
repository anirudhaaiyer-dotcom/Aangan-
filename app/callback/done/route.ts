import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

// "Mark done" on the dashboard callback list. Not under /api, so the dashboard's
// basic auth (middleware.ts) protects it.
export async function POST(req: NextRequest) {
  const f = await req.formData();
  const id = String(f.get("id") ?? "");
  const by = String(f.get("by") ?? "").trim() || "Front desk";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await db().from("calls").update({ callback_done_at: new Date().toISOString(), callback_done_by: by }).eq("id", id);
  return NextResponse.redirect(new URL("/#callbacks", req.url), 303);
}
