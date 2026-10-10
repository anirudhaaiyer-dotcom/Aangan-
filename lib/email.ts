import { env } from "./env";

import nodemailer from "nodemailer";

type Attachment = { filename: string; path: string };

/** Gmail SMTP is used when GMAIL_USER + GMAIL_APP_PASSWORD are set: it can email any address. */
export const usingGmail = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transport: nodemailer.Transporter | null = null;
function gmail() {
  transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
  });
  return transport;
}

/** Send through Gmail SMTP if configured, otherwise Resend's REST API. */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string; attachments?: Attachment[] }) {
  if (usingGmail()) {
    const attachments = await Promise.all((opts.attachments ?? []).map(async (a) => {
      const r = await fetch(a.path);
      if (!r.ok) throw new Error(`Attachment ${a.filename}: HTTP ${r.status}`);
      return { filename: a.filename, content: Buffer.from(await r.arrayBuffer()), contentType: "application/pdf" };
    }));
    const info = await gmail().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Aangan Studio"}" <${process.env.GMAIL_USER}>`,
      replyTo: process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER,
      to: opts.to, subject: opts.subject, html: opts.html, text: opts.text, attachments,
    });
    return info.messageId as string;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("EMAIL_FROM"), to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text,
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  return data.id as string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function handoffEmail(o: {
  heading: string;
  facts: [string, string | null | undefined][];
  note: string;
  buttons: { label: string; url: string }[];
  footer?: string;
}) {
  const facts = o.facts.filter(([, v]) => v);
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;color:#16211F">
  <h2 style="margin:0 0 12px;font-size:20px">${esc(o.heading)}</h2>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:14px">${facts
    .map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#56635F">${esc(k)}</td><td style="padding:3px 0">${esc(String(v))}</td></tr>`)
    .join("")}</table>
  <div style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#F3F5F4;border-radius:8px;padding:12px 14px">${esc(o.note)}</div>
  <p style="margin:18px 0">${o.buttons
    .map((b, i) => `<a href="${b.url}" style="display:inline-block;margin-right:8px;padding:9px 16px;border-radius:6px;text-decoration:none;font-size:14px;${i === 0 ? "background:#1F5E57;color:#fff" : "border:1px solid #1F5E57;color:#1F5E57"}">${esc(b.label)}</a>`)
    .join("")}</p>
  ${o.footer ? `<p style="font-size:12px;color:#56635F">${esc(o.footer)}</p>` : ""}
</div>`;
  const text = [o.heading, "", ...facts.map(([k, v]) => `${k}: ${v}`), "", o.note, "", ...o.buttons.map((b) => `${b.label}: ${b.url}`), o.footer ?? ""].join("\n");
  return { html, text };
}

/**
 * With Gmail SMTP configured, client emails go straight to the client.
 * Resend's sandbox sender (onboarding@resend.dev) can only deliver to the account owner, so
 * without Gmail (and without a verified domain) client emails go to the front desk with a banner saying
 * who they were meant for, so the demo still shows exactly what the client receives.
 */
export function clientRecipient(clientEmail: string): { to: string; demoFor: string | null } {
  const sandbox = !usingGmail() && /resend\.dev/i.test(process.env.EMAIL_FROM ?? "");
  const override = process.env.CLIENT_EMAIL_OVERRIDE;
  if (override) return { to: override, demoFor: clientEmail };
  if (sandbox) return { to: env("FRONT_DESK_EMAIL"), demoFor: clientEmail };
  return { to: clientEmail, demoFor: null };
}

export const portfolioAttachment = (): Attachment => ({
  filename: "Aangan-Studio-Portfolio.pdf",
  path: process.env.PORTFOLIO_URL || new URL("/aangan-portfolio-sample.pdf", env("APP_URL")).toString(),
});

/** A warm, plain email to the client. Never contains a price. */
export function clientEmail(o: {
  demoFor: string | null;
  greetingName: string | null;
  heading: string;
  paragraphs: string[];
  slot?: string | null;
  buttons: { label: string; url: string }[];
  aboutAangan?: boolean;
}) {
  const hi = o.greetingName ? `Hi ${o.greetingName.split(" ")[0]},` : "Hi,";
  const about = o.aboutAangan
    ? [
        "About Aangan Studio",
        "We design and build homes and small offices across Pune and PCMC: full homes, a few rooms, or offices up to about 3,000 sq ft. Our own team and contractors handle execution, so the design and the finished space match.",
        "How it works: free consultation → design (3–4 weeks) → execution (8–16 weeks) → handover. Your designer will walk you through pricing at the consultation, because it depends on your site and choices.",
        "Our portfolio is attached.",
      ]
    : [];
  const demo = o.demoFor ? `Demo copy: in production this email goes to ${o.demoFor}.` : "";
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;color:#1E2A26;line-height:1.55">
  ${demo ? `<p style="background:#FFF4D6;border:1px solid #E8D18A;border-radius:6px;padding:8px 10px;font-size:12px;margin:0 0 14px">${esc(demo)}</p>` : ""}
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5E6C67;margin:0 0 6px">Aangan Studio · Pune</p>
  <h2 style="margin:0 0 14px;font-size:21px;font-weight:600">${esc(o.heading)}</h2>
  <p style="margin:0 0 10px;font-size:15px">${esc(hi)}</p>
  ${o.paragraphs.map((p) => `<p style="margin:0 0 10px;font-size:15px">${esc(p)}</p>`).join("")}
  ${o.slot ? `<div style="background:#EFE6D8;border-radius:8px;padding:12px 14px;margin:14px 0;font-size:15px"><strong>Your consultation:</strong> ${esc(o.slot)}</div>` : ""}
  <p style="margin:16px 0">${o.buttons
    .map((b, i) => `<a href="${b.url}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px;${i === 0 ? "background:#B4643C;color:#fff" : "border:1px solid #B4643C;color:#B4643C"}">${esc(b.label)}</a>`)
    .join("")}</p>
  ${about.length ? `<div style="border-top:1px solid #D9D2C5;margin-top:14px;padding-top:12px"><h3 style="margin:0 0 6px;font-size:15px">${about[0]}</h3>${about.slice(1).map((p) => `<p style="margin:0 0 8px;font-size:14px;color:#33413C">${esc(p)}</p>`).join("")}</div>` : ""}
  <p style="font-size:12px;color:#5E6C67;margin-top:18px">Aangan Studio, Pune. Reply to this email or call the studio number anytime; we answer day and night.</p>
</div>`;
  const text = [demo, hi, "", ...o.paragraphs, o.slot ? `Your consultation: ${o.slot}` : "", "", ...o.buttons.map((b) => `${b.label}: ${b.url}`), "", ...about]
    .filter((l) => l !== undefined).join("\n");
  return { html, text };
}
