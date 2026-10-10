import { db } from "@/lib/supabase";
import { callbackList, type CallRow } from "@/lib/callbacks";

export const dynamic = "force-dynamic";

type Call = CallRow & {
  duration_sec: number; after_hours: boolean | null; asked_pricing: boolean;
  showed_up: boolean | null; project_won: boolean | null; project_value_inr: number | null;
  cost_voice_inr: number; cost_llm_inr: number; ai_error: string | null;
  client_email_sent_at: string | null;
};
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "–";
const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 60 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "–");

export default async function Dashboard() {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data, error } = await db()
    .from("calls")
    .select("id, created_at, started_at, ended_at, caller_number, duration_sec, after_hours, classification, asked_pricing, booked_slot, claimed_by, claimed_at, reschedule_requested_at, callback_done_at, classified_by, ai_error, handoff_note, transcript, client_email, client_email_sent_at, linked_call_id, showed_up, project_won, project_value_inr, cost_voice_inr, cost_llm_inr, fit_reason, status")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) return <main style={wrap}><h1>Dashboard</h1><p>Couldn't load calls: {error.message}</p></main>;
  const calls = (data ?? []) as Call[];

  const connected = calls.filter((c) => c.status !== "failed");
  const qualified = calls.filter((c) => c.classification === "qualified");
  const booked = calls.filter((c) => c.booked_slot);
  const showed = calls.filter((c) => c.showed_up);
  const won = calls.filter((c) => c.project_won);
  const wonValue = won.reduce((s, c) => s + Number(c.project_value_inr ?? 0), 0);
  const voice = calls.reduce((s, c) => s + Number(c.cost_voice_inr ?? 0), 0);
  const llm = calls.reduce((s, c) => s + Number(c.cost_llm_inr ?? 0), 0);
  const cost = voice + llm;
  const callbacks = callbackList(calls);
  const claimMins = calls.filter((c) => c.claimed_at && (c.ended_at ?? c.started_at))
    .map((c) => (new Date(c.claimed_at!).getTime() - new Date((c.ended_at ?? c.started_at)!).getTime()) / 60000).filter((m) => m >= 0);
  const medClaim = median(claimMins);
  const priced = calls.filter((c) => c.asked_pricing);
  const byNumber = new Map<string, number>();
  calls.forEach((c) => c.caller_number && byNumber.set(c.caller_number, (byNumber.get(c.caller_number) ?? 0) + 1));
  const repeatCallers = [...byNumber.values()].filter((n) => n > 1).length;
  const classifiedCalls = calls.filter((c) => c.classification);
  const aiOk = classifiedCalls.filter((c) => (c.classified_by ?? "gemini") !== "rules" && !c.fit_reason?.startsWith("AI step failed")).length;
  const dropped = calls.filter((c) => c.status === "in_progress" && !c.classification && Date.now() - new Date(c.created_at).getTime() > 15 * 60000).length;

  const tiles: [string, string, string][] = [
    ["Needs a call back", String(callbacks.length), callbacks.length ? `${callbacks.filter((c) => c.priority === 1).length} urgent · see list below` : "Nothing waiting on a person"],
    ["Calls answered", `${connected.length} / ${calls.length}`, `Agent picks up instantly, 24×7${dropped ? ` · ${dropped} dropped` : ""}`],
    ["After hours", String(calls.filter((c) => c.after_hours).length), "Calls the front desk would have missed"],
    ["Qualified", String(qualified.length), `${pct(qualified.length, connected.length)} of answered calls`],
    ["Consultations booked", String(booked.length), `${pct(booked.length, qualified.length)} of qualified`],
    ["Follow-ups sent", String(calls.filter((c) => c.client_email_sent_at).length), "Confirmation, About Aangan and portfolio emailed"],
    ["Reschedules", String(calls.filter((c) => c.classification === "reschedule").length), "Callers who couldn't make their slot"],
    ["Showed up", String(showed.length), `${pct(showed.length, booked.length)} of booked`],
    ["Projects won", String(won.length), wonValue ? inr(wonValue) + " in projects" : "Mark wins in Supabase"],
    ["Cost to run", inr(cost), `Voice ${inr(voice)} · AI ${inr(llm)}`],
    ["Cost per booking", booked.length ? inr(cost / booked.length) : "–", "Total cost ÷ consultations booked"],
    ["Time to claim", medClaim === null ? "–" : medClaim < 60 ? `${Math.round(medClaim)} min` : `${(medClaim / 60).toFixed(1)} h`, "Median, call end → designer claims"],
    ["Asked about price", String(priced.length), `${pct(priced.length, connected.length)} of calls · deflected to the designer`],
    ["Repeat callers", String(repeatCallers), "Same number called more than once"],
    ["AI health", pct(aiOk, classifiedCalls.length), `Classified by Gemini · rest by backup rules`],
  ];

  return (
    <main style={wrap}>
      <p style={eyebrow}>Aangan Studio · last 30 days</p>
      <h1 style={{ margin: "4px 0 20px", fontSize: 30 }}>Call desk</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {tiles.map(([k, v, s]) => (
          <div key={k} style={card}>
            <div style={eyebrow}>{k}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 13, color: "#56635F" }}>{s}</div>
          </div>
        ))}
      </div>

      <h2 id="callbacks" style={{ marginTop: 32, fontSize: 18 }}>Call-back list</h2>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "#56635F" }}>Every call where a person still has to pick up the phone: dropped calls, complaints, qualified callers with no slot, bookings nobody claimed, reschedules.</p>
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #D5DDDA", borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead><tr>{["", "Caller", "Why", "What to do", "Waiting", ""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {callbacks.map(({ call: c, priority, why, todo }) => (
              <tr key={c.id}>
                <td style={td}><span style={{ ...pill, ...(priority === 1 ? tone.complaint : priority === 2 ? tone.unclear : tone.not_fit) }}>{priority === 1 ? "Urgent" : priority === 2 ? "Today" : "Review"}</span></td>
                <td style={td}>{c.caller_number ?? "Unknown"}<div style={{ fontSize: 12, color: "#56635F" }}>{when(c.started_at ?? c.created_at)}</div></td>
                <td style={td}>{why}</td>
                <td style={{ ...td, color: "#56635F" }}>{todo}</td>
                <td style={td}>{ago(c.ended_at ?? c.started_at ?? c.created_at)}</td>
                <td style={td}>
                  <form method="post" action="/callback/done" style={{ margin: 0 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={doneBtn}>Mark done</button>
                  </form>
                </td>
              </tr>
            ))}
            {!callbacks.length && <tr><td style={td} colSpan={6}>Nobody is waiting for a call back.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent calls</h2>
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #D5DDDA", borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr>{["When", "Caller", "Outcome", "Booked", "Claimed by", "Follow-up", "Asked price", "Why"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {calls.slice(0, 50).map((c) => (
              <tr key={c.id}>
                <td style={td}>{when(c.started_at ?? c.created_at)}{c.after_hours ? " 🌙" : ""}</td>
                <td style={td}>{c.caller_number ?? "–"}{c.caller_number && (byNumber.get(c.caller_number) ?? 0) > 1 ? <span style={{ ...pill, marginLeft: 6, background: "#EEF2F0" }}>repeat</span> : null}</td>
                <td style={td}><span style={{ ...pill, ...(tone[c.classification ?? "unclear"] ?? {}) }}>{c.classification ? label[c.classification] ?? c.classification : c.status === "in_progress" ? "In progress" : "–"}</span>{c.classified_by === "rules" ? <div style={{ fontSize: 11, color: "#8A6410" }}>backup rules</div> : null}</td>
                <td style={td}>{c.booked_slot ? new Date(c.booked_slot).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "–"}</td>
                <td style={td}>{c.claimed_by ?? "–"}</td>
                <td style={td}>{c.client_email_sent_at ? "Emailed" : c.classification === "qualified" ? "No email" : ""}</td>
                <td style={td}>{c.asked_pricing ? "Yes" : ""}</td>
                <td style={{ ...td, color: "#56635F" }}>{c.fit_reason ?? ""}</td>
              </tr>
            ))}
            {!calls.length && <tr><td style={td} colSpan={8}>No calls yet. Place a test call to the studio number.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "32px 20px 48px" };
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#56635F", margin: 0 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #D5DDDA", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 4 };
const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #D5DDDA", fontSize: 12, color: "#56635F", textTransform: "uppercase", letterSpacing: ".06em" };
const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #EEF2F0", verticalAlign: "top" };
const doneBtn: React.CSSProperties = { background: "#1F5E57", color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" };
const pill: React.CSSProperties = { padding: "2px 8px", borderRadius: 999, fontSize: 12 };
const label: Record<string, string> = { qualified: "Qualified", not_fit: "Not a fit", complaint: "Complaint", reschedule: "Reschedule", unclear: "Unclear" };
const tone: Record<string, React.CSSProperties> = {
  qualified: { background: "#E2F0E3", color: "#2E6B3A" },
  not_fit: { background: "#EEF2F0", color: "#56635F" },
  complaint: { background: "#F7E6E2", color: "#A23B2A" },
  unclear: { background: "#F6EDD6", color: "#8A6410" },
  reschedule: { background: "#E3E9F4", color: "#2F4D80" },
};
