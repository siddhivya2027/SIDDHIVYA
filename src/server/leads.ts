import "server-only";
import { leadSummary, type Lead } from "@/lib/site/leads";

/**
 * Lead alerts. If LEAD_WEBHOOK_URL is set, every enquiry is POSTed there as JSON
 * ({ text, lead, reference }) — this works with Slack/Google Chat incoming webhooks, n8n, Make,
 * Zapier or a Google Apps Script that appends to a sheet and emails the team.
 * If it is not set, the alert is reported as "pending_configuration" — never as sent.
 */
export async function sendLeadAlert(lead: Lead, reference: string): Promise<"sent" | "pending_configuration" | "failed"> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return "pending_configuration";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: leadSummary(lead, reference), reference, lead: { ...lead, website: undefined } }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export function newReference(kind: Lead["kind"]): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${kind === "signup" ? "SGN" : kind === "demo" ? "DEM" : "ENQ"}-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
