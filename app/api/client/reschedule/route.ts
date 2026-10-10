import { NextRequest } from "next/server";
import { db } from "@/lib/supabase";
import { verify } from "@/lib/links";
import { page, btn } from "@/lib/page";
import { env, optionalEnv } from "@/lib/env";
import { sendEmail, handoffEmail } from "@/lib/email";

export const runtime = "nodejs";
const ACTION = "client-reschedule";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-IN", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
}).format(new Date(iso));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// The "Can't make it?" link in the client's email. GET shows the choices; nothing changes
// until the client taps a button (email scanners open links on their own).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = q.get("id") ?? "", sig = q.get("sig");
  if (!verify(id, ACTION, sig)) return page("Link not valid", "<h2>This link isn't valid</h2><p>Use the button in your Aangan email, or call the studio.</p>", 403);
  const { data } = await db().from("calls").select("booked_slot, reschedule_requested_at").eq("id", id).single();
  const booking = optionalEnv("CALCOM_BOOKING_URL");
  return page("Reschedule your consultation", `<h2 style="margin-top:0">Can't make it? No problem.</h2>
<p>${data?.booked_slot ? `Your consultation is on <strong>${esc(fmt(data.booked_slot))}</strong>.` : "Let's find a time that works."}</p>
${booking ? `<p><a href="${esc(booking)}" style="display:inline-block;background:#B4643C;color:#fff;border-radius:6px;padding:10px 18px;text-decoration:none">Pick a new time</a></p>` : ""}
<form method="post" style="margin-top:14px"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="sig" value="${esc(sig!)}">
<label style="display:block;margin:6px 0;font-size:14px">Or tell us when suits you, and we'll call to confirm</label>
<input name="note" placeholder="e.g. Saturday morning" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #D5DDDA;border-radius:6px;font-size:15px;margin-bottom:12px">
${btn("Ask the studio to call me")}</form>
<p style="font-size:13px;color:#56635F">You can also call the studio number anytime; our assistant can move it for you.</p>`);
}

export async function POST(req: NextRequest) {
  const f = await req.formData();
  const id = String(f.get("id") ?? ""), sig = String(f.get("sig") ?? ""), note = String(f.get("note") ?? "").trim().slice(0, 200);
  if (!verify(id, ACTION, sig)) return page("Link not valid", "<h2>This link isn't valid</h2>", 403);
  const supa = db();
  const { data: c } = await supa.from("calls")
    .update({ reschedule_requested_at: new Date().toISOString(), callback_done_at: null })
    .eq("id", id).select("caller_number, booked_slot, handoff_note, designer_id").single();
  try {
    let to = env("FRONT_DESK_EMAIL");
    if (c?.designer_id) {
      const { data: d } = await supa.from("designers").select("email").eq("id", c.designer_id).single();
      to = d?.email ?? to;
    }
    const { html, text } = handoffEmail({
      heading: "Client can't make their consultation",
      facts: [["Phone", c?.caller_number], ["Booked for", c?.booked_slot ? fmt(c.booked_slot) : null], ["Client's note", note || "None"]],
      note: c?.handoff_note ?? "",
      buttons: [],
      footer: "Sent from the client's reschedule link. Call them to confirm a new time; it's on Nikhil's call-back list until done.",
    });
    await sendEmail({ to, subject: `[Reschedule] ${c?.caller_number ?? "Client"} can't make ${c?.booked_slot ? fmt(c.booked_slot) : "their slot"}`, html, text });
  } catch (e) { console.error("reschedule email failed", e); }
  return page("Request sent", "<h2>Thanks, we've got it</h2><p>Your designer will call you to confirm a new time.</p>");
}
