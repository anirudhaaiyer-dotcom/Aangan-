import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { classifyWithFallback } from "@/lib/gemini";
import { classifyByRules } from "@/lib/rules";
import { parseTranscriptString, verifyRequest } from "@/lib/vaani";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Dry run: classify a transcript with the live rules and model, with NO side effects
 * (no database row, no email, no HubSpot deal). Used to test past enquiries.
 * POST /api/eval?token=<EVAL_TOKEN or VAANI_WEBHOOK_SECRET>
 *   body: { id, transcript }  or  [{ id, transcript }, ...] (max 10)
 * Add &engine=rules to test the backup classifier without using Gemini quota.
 * Accepts "Front Desk:/Caller:", "AGENT:/USER:", WhatsApp threads or plain web-form text.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("x-eval-token");
  const evalToken = process.env.EVAL_TOKEN;
  const okToken = verifyRequest(raw, null, token, env("VAANI_WEBHOOK_SECRET")) || (!!evalToken && token === evalToken);
  if (!okToken) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Send JSON: { id, transcript }" }, { status: 400 }); }
  const items: any[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [body];
  if (items.length > 10) return NextResponse.json({ error: "Max 10 transcripts per request" }, { status: 400 });
  const results = [];
  const rulesOnly = req.nextUrl.searchParams.get("engine") === "rules";
  for (const it of items) results.push(await evalOne(it, rulesOnly));
  return NextResponse.json(Array.isArray(body) || body?.items ? results : results[0]);
}

async function evalOne(it: any, rulesOnly: boolean) {
  const id = it?.id ?? "eval";
  const text = String(it?.transcript ?? it?.text ?? it?.message ?? it?.body ?? "");
  const turns = parseTranscriptString(text);
  const call = {
    vaaniCallId: String(id), event: "eval", status: "eval", callerNumber: null,
    startedAt: null, endedAt: null, durationSec: 0, summary: "", collected: {},
    transcript: turns, recordingUrl: null, bookedSlot: null, clientEmail: null,
  };
  // ?engine=rules tests the backup classifier without using Gemini quota.
  const { result, engine, aiError } = rulesOnly
    ? { result: classifyByRules(call), engine: "rules" as const, aiError: undefined }
    : await classifyWithFallback(call);
  return { id, turns: turns.length, engine, ...(aiError ? { ai_error: aiError } : {}), ...result };
}
