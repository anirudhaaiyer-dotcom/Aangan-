/**
 * The callback list: every call where a person still has to pick up the phone.
 * This is the safety net for when the agent, the booking or a designer drops the ball
 * (for example T12: the front desk promised to "revert by end of day").
 */
export type CallRow = {
  id: string; created_at: string; started_at: string | null; ended_at: string | null;
  caller_number: string | null; status: string | null; classification: string | null;
  booked_slot: string | null; claimed_by: string | null; claimed_at: string | null;
  reschedule_requested_at: string | null; callback_done_at: string | null;
  classified_by: string | null; handoff_note: string | null; fit_reason: string | null;
  transcript: unknown[] | null;
  client_email?: string | null; linked_call_id?: string | null;
};

export type Callback = { call: CallRow; priority: 1 | 2 | 3; why: string; todo: string };

const MIN = 60_000;

export function callbackReasons(c: CallRow, now = Date.now()): Callback[] {
  if (c.callback_done_at) return [];
  const out: Callback[] = [];
  const age = now - new Date(c.ended_at ?? c.started_at ?? c.created_at).getTime();
  const urgent = /URGENT/i.test(c.handoff_note ?? "");

  if (/^\s*SAFETY/i.test(c.handoff_note ?? ""))
    out.push({ call: c, priority: 1, why: "Possible safety concern on the call", todo: "Listen to the recording now; call 112 if someone may be at risk" });
  if (c.status === "in_progress" && !c.classification && age > 15 * MIN)
    out.push({ call: c, priority: 1, why: "Call dropped before it finished", todo: "Call back now; the agent never got the details" });
  if (c.classification === "complaint")
    out.push({ call: c, priority: 1, why: "Complaint from a caller", todo: "Senior person calls back today; no commitments on the agent's side" });
  if (c.classification === "qualified" && !c.booked_slot)
    out.push({ call: c, priority: urgent ? 1 : 2, why: "Qualified, but no consultation slot booked", todo: "Call to book, or send the booking link" });
  if (c.classification === "qualified" && c.booked_slot && !c.claimed_by && age > 2 * 60 * MIN)
    out.push({ call: c, priority: 2, why: "Consultation booked, no designer has claimed it for 2+ hours", todo: "Assign a designer and confirm the slot with the client" });
  if (c.reschedule_requested_at)
    out.push({ call: c, priority: 2, why: `Designer${c.claimed_by ? ` (${c.claimed_by})` : ""} asked to reschedule`, todo: "Confirm the new time with the client" });
  if (c.classification === "reschedule" && !c.linked_call_id)
    out.push({ call: c, priority: 2, why: "Wants to move a consultation, but no booking matches this number", todo: "Find their booking and offer a new time" });
  if (c.classification === "unclear" && c.caller_number && (c.transcript?.length ?? 0) > 0 && !out.length)
    out.push({ call: c, priority: 3, why: c.fit_reason?.startsWith("AI step failed") ? "AI could not classify the call" : "Not enough information on the call", todo: "Listen to the recording and call back" });
  if (c.classified_by === "rules" && c.classification !== "not_fit" && !out.length)
    out.push({ call: c, priority: 3, why: "Classified by backup rules (AI was down)", todo: "Read the transcript and confirm the outcome" });
  if (c.classification === "qualified" && !c.client_email && !c.claimed_by && !out.length)
    out.push({ call: c, priority: 3, why: "No email captured, so the portfolio wasn't sent", todo: "Share the portfolio on WhatsApp or ask for an email" });
  if (urgent && !out.length && c.classification === "qualified" && !c.claimed_by)
    out.push({ call: c, priority: 1, why: "Caller already waited for a reply elsewhere", todo: "Designer calls today" });
  return out;
}

export function callbackList(calls: CallRow[], now = Date.now()): Callback[] {
  return calls.flatMap((c) => callbackReasons(c, now).slice(0, 1))
    .sort((a, b) => a.priority - b.priority || new Date(a.call.created_at).getTime() - new Date(b.call.created_at).getTime());
}
