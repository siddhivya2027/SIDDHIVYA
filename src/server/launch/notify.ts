import "server-only";

/**
 * Telegram alerts through the Bot API. TELEGRAM_BOT_TOKEN comes from @BotFather; each seller's chat ID is saved in
 * SIDDHIVYA (Alerts page). TELEGRAM_CHAT_ID is the agency team's own chat, used when no chat ID is given.
 * Without a token every alert is reported as "pending_configuration" — never as sent.
 */
export type SendState = "sent" | "pending_configuration" | "failed";

export async function sendTelegram(text: string, chatId?: string): Promise<{ state: SendState; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { state: "pending_configuration" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return j.ok ? { state: "sent" } : { state: "failed", error: j.description || `Telegram answered ${res.status}` };
  } catch (e) {
    return { state: "failed", error: e instanceof Error ? e.message : "Network error" };
  }
}

/** Optional second route for team alerts: any webhook (Slack, Google Chat, n8n, Make, Zapier). */
export async function sendWebhook(text: string, extra: Record<string, unknown> = {}): Promise<SendState> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return "pending_configuration";
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, ...extra }), signal: AbortSignal.timeout(6000) });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
