import type { Classification } from "./gemini";
import type { NormalisedCall } from "./vaani";

/**
 * Backup classifier: plain keyword rules taken from qualified.md and services.md.
 * Used only when Gemini fails (quota, outage, model retired), so a call is never lost.
 * It is deliberately cautious: when unsure it says "unclear" and a human calls back.
 */

const IN_AREA = [
  "kothrud", "baner", "aundh", "wakad", "koregaon park", "kalyani nagar", "viman nagar", "hadapsar",
  "magarpatta", "nibm", "kondhwa", "undri", "shivane", "warje", "erandwane", "deccan", "pimpri",
  "chinchwad", "pimple saudagar", "pimple nilakh", "ravet", "hinjewadi", "kharadi", "pashan", "bavdhan",
  "balewadi", "wagholi", "nanded city", "sinhagad road", "shivaji nagar", "pcmc", "pune",
];
const OUT_AREA = ["talegaon", "lonavala", "nashik", "mumbai", "thane", "navi mumbai", "satara", "kolhapur",
  "nagpur", "aurangabad", "bangalore", "bengaluru", "hyderabad", "delhi", "goa", "ahmednagar"];
const OUT_SCOPE = /\b(restaurant|cafe|café|hotel|resort|retail|shop|showroom|store|gym|fitness|salon|spa)\b/i;
const ADVICE_ONLY = /(just (want|looking for)? ?(some )?(ideas|suggestions|advice)|give us some ideas|suggestions on colou?rs|furniture arrangement|just exploring|only (want|need) (advice|a consultation)|do the execution myself|second opinion)/i;
// Existing client with a live project problem: a person must handle it.
const COMPLAINT = /(my designer|my project (has|is)|existing (client|project)|site (work|team) (has|is)|refund|want to speak to (nikhil|someone senior))/i;
// A NEW lead annoyed that nobody got back: still a lead, but urgent.
const FRUSTRATED = /(no one (replied|got back)|nobody (replied|got back)|not a good sign|haven'?t heard back|still waiting|been (two|three|four|\d) days|called (on )?monday|messaged \d+ days ago|not acceptable)/i;
// Existing booking the caller can't make.
const RESCHEDULE = /(can'?t make it|cannot make it|won'?t be able to (make|come|attend)|not be able to (make|come|attend)|reschedule|postpone|move (my|the) (consultation|appointment|meeting)|change (my|the) (slot|time|appointment)|cancel (my|the) (consultation|appointment))/i;
// Guardrails: harmful or safety-related talk goes to a person; pranks are logged and dropped.
const SAFETY = /\b(kidnap\w*|bomb|gun|weapon|knife|murder|kill|ransom|hostage|suicide|hurt myself|drugs?)\b/i;
const PRANK = /(toilet in (my|the) kitchen|kitchen in (my|the) (toilet|bathroom)|spaceship|on the moon|haunted|ghost|prank|just kidding|for fun|time machine|pool on (my|the) balcony)/i;
const RUSH = /(before diwali|in (two|three|2|3) weeks|within (two|three|2|3) weeks|3 weeks maximum|next week|this month itself|guests arriving)/i;
const PRICING = /(how much|cost|price|pricing|rate|ballpark|per sq\.? ?ft|per square|charges?|budget range)/i;
const SCOPE = /(\d\s?bhk|kitchen|bedroom|living room|wardrobe|office|villa|bungalow|flat|apartment|home|interiors?|workstations?|fit-?out)/i;

const lower = (s: string) => s.toLowerCase();

export function classifyByRules(call: NormalisedCall): Classification {
  const all = call.transcript.map((t) => t.text).join("\n") + "\n" + call.summary;
  const callerText = call.transcript.filter((t) => t.role === "CALLER").map((t) => t.text).join("\n") || all;
  const t = lower(callerText);

  const area = IN_AREA.find((a) => t.includes(a)) ?? null;
  const specificArea = IN_AREA.filter((a) => a !== "pune" && a !== "pcmc").find((a) => t.includes(a)) ?? null;
  const outArea = OUT_AREA.find((a) => t.includes(a)) ?? null;
  const bhk = callerText.match(/(\d)\s?bhk/i)?.[0]?.toUpperCase().replace(/\s/g, "") ?? null;
  const sq = callerText.match(/([\d,]{3,6})\s*(sq\.?\s?ft|square feet|sqft)/i);
  const sqft = sq ? Number(sq[1].replace(/,/g, "")) : null;
  const lakh = callerText.match(/(\d+(?:\.\d+)?)\s*(?:to|-|–)?\s*(\d+(?:\.\d+)?)?\s*lakh/i);
  const budgetMax = lakh ? Number(lakh[2] ?? lakh[1]) : null;
  const asked_pricing = PRICING.test(callerText);
  const office = /\b(office|workstations?|startup|coworking|commercial)\b/i.test(callerText);

  let classification: Classification["classification"] = "unclear";
  let fit_reason = "Backup rules: not enough information to decide; a person should call back.";

  const safety = SAFETY.test(callerText);
  if (safety) {
    classification = "unclear";
    fit_reason = "Backup rules: possible safety concern; a person must review the recording.";
  } else if (PRANK.test(callerText) && !(specificArea && SCOPE.test(callerText) && /\d\s?bhk|sq\.? ?ft/i.test(callerText))) {
    classification = "not_fit";
    fit_reason = "Off-topic or prank call.";
  } else if (RESCHEDULE.test(callerText) && /(consultation|appointment|meeting|slot|booking|booked|designer)/i.test(callerText)) {
    classification = "reschedule";
    fit_reason = "Backup rules: caller has a consultation booked and wants to move it.";
  } else if (COMPLAINT.test(callerText)) {
    classification = "complaint";
    fit_reason = "Backup rules: sounds like an existing client or an unhappy caller; a person must handle it.";
  } else if (outArea && !specificArea) {
    classification = "not_fit"; fit_reason = `Backup rules: criterion 2 (service area), ${outArea} is outside Pune/PCMC.`;
  } else if (OUT_SCOPE.test(callerText)) {
    classification = "not_fit"; fit_reason = "Backup rules: out of scope (restaurant, hotel, retail, gym or similar).";
  } else if (ADVICE_ONLY.test(callerText)) {
    classification = "not_fit"; fit_reason = "Backup rules: criterion 1, wants advice or ideas, not a project with execution.";
  } else if (RUSH.test(callerText)) {
    classification = "not_fit"; fit_reason = "Backup rules: criterion 3, needs it done in under 6 weeks.";
  } else if (budgetMax !== null && budgetMax < 3 && SCOPE.test(callerText)) {
    classification = "not_fit"; fit_reason = `Backup rules: criterion 4, volunteered budget (up to ₹${budgetMax} lakh) is clearly below the scope.`;
  } else if (office && sqft !== null && sqft < 500) {
    classification = "not_fit"; fit_reason = `Backup rules: ${sqft} sq ft commercial space is below the studio's minimum scope.`;
  } else if ((specificArea || (area && (bhk || sqft))) && SCOPE.test(callerText)) {
    classification = "qualified";
    fit_reason = "Backup rules: real project in the service area; budget and decision-maker not disproven.";
  }

  const note = [
    safety ? "SAFETY: the caller mentioned something harmful or dangerous. Review the recording." : "",
    FRUSTRATED.test(callerText) ? "URGENT: caller already waited for a reply. Call back today." : "",
    `[Backup rules used: the AI step was unavailable. Please read the transcript before calling.]`,
    `Property: ${[bhk, sqft ? `~${sqft} sq ft` : null, area].filter(Boolean).join(", ") || "not captured"}`,
    budgetMax !== null ? `Budget mentioned by caller: up to ₹${budgetMax} lakh` : "Budget: not discussed",
    asked_pricing ? "Asked about pricing; told designer will cover it." : "",
  ].filter(Boolean).join("\n");

  return {
    classification, fit_reason, asked_pricing,
    segment: office ? "office" : area || bhk ? "home" : "unknown",
    lead: {
      name: callerText.match(/(?:i'?m|my name is|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/)?.[1] ?? null,
      area: area ? area.replace(/\b\w/g, (c) => c.toUpperCase()) : outArea,
      property_type: bhk ?? (office ? "Office" : null),
      size_sqft: sqft, scope: null,
      budget_band: budgetMax !== null ? `up to ₹${budgetMax} lakh (volunteered)` : null,
      timeline: null, source: null,
    },
    handoff_note: note,
  };
}
