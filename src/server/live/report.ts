import "server-only";
import { db } from "@/server/db";
import { sendTelegram } from "@/server/launch/notify";
import type { AlertRules, LaunchProduct, SellerSetup, Settlement } from "@/lib/launch/types";
import type { Client } from "@/lib/demo/types";

/** Builds the daily report from the database (real orders + imported settlements) and sends it on Telegram. */
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
const LABEL: Record<string, string> = { amazon: "Amazon", flipkart: "Flipkart", meesho: "Meesho", blinkit: "Blinkit", zepto: "Zepto", instamart: "Instamart" };

export async function buildReports() {
  const d = db();
  const docs = await d.doc.findMany({ where: { kind: { in: ["launch", "seller", "setup", "settings", "settlement"] } } });
  const of = <T,>(k: string) => docs.filter((x) => x.kind === k).map((x) => ({ id: x.id, clientId: x.clientId, data: x.data as unknown as T }));
  const launches = of<LaunchProduct>("launch").map((x) => x.data);
  const sellers = of<Client>("seller").map((x) => x.data);
  const setups = Object.fromEntries(of<SellerSetup>("setup").map((x) => [x.id, x.data]));
  const rules = (of<AlertRules>("settings").find((x) => x.id === "alertRules")?.data) ?? { lowStockUnits: 20, dailyReport: true } as AlertRules;
  const settlements = of<Settlement>("settlement").map((x) => x.data);
  const since = new Date(Date.now() - 86400000);
  const orders = await d.order.findMany({ where: { ts: { gte: new Date(Date.now() - 400 * 86400000) } }, select: { clientId: true, channel: true, ts: true, qty: true, sale: true, sku: true, status: true } });
  const good = orders.filter((o) => !/cancel/i.test(o.status));

  const forSeller = (cid?: string, name = "Agency") => {
    const L = launches.filter((l) => !cid || l.clientId === cid);
    const O = good.filter((o) => !cid || o.clientId === cid);
    const day = O.filter((o) => o.ts >= since);
    const S = settlements.filter((s) => (!cid || s.clientId === cid) && new Date(s.date) >= since);
    const sales = day.reduce((a, o) => a + o.sale, 0) + S.reduce((a, s) => a + s.sale, 0);
    const byApp = Object.entries(day.reduce<Record<string, number>>((m, o) => ({ ...m, [o.channel]: (m[o.channel] ?? 0) + 1 }), {})).map(([k, n]) => `${LABEL[k] ?? k} ${n}`).join(", ");
    const sold = (p: LaunchProduct) => O.filter((o) => o.clientId === p.clientId && p.sku && o.sku === p.sku).reduce((a, o) => a + o.qty, 0);
    const low = L.filter((p) => p.liveSince && p.stock - sold(p) <= rules.lowStockUnits).map((p) => `${p.name} (${Math.max(0, p.stock - sold(p))} left)`);
    const waiting = L.filter((p) => p.approval.state === "sent").map((p) => p.name);
    const text = [
      `📊 SIDDHIVYA daily report — ${name}`,
      `Last 24 hours: ${day.length + S.length} orders, sales ${rs(sales)}.`,
      byApp ? `By app: ${byApp}.` : "",
      S.length ? `Settled money in: ${rs(S.reduce((a, s) => a + s.payout, 0))}.` : "",
      low.length ? `⚠️ Running low: ${low.join("; ")}.` : "Stock: all fine.",
      waiting.length ? `⏳ Waiting for approval: ${waiting.join(", ")}.` : "",
    ].filter(Boolean).join("\n");
    return { text, low };
  };

  return { rules, sellers, setups, forSeller };
}

export async function sendAllReports() {
  const { rules, sellers, setups, forSeller } = await buildReports();
  const sent: Record<string, string> = {};
  if (rules.dailyReport === false) return { skipped: "Daily report is switched off on the Alerts page.", sent };
  for (const s of sellers) {
    const chat = setups[s.id]?.telegramChatId;
    if (chat) sent[s.name] = (await sendTelegram(forSeller(s.id, s.name).text, chat)).state;
  }
  sent.Agency = (await sendTelegram(forSeller(undefined, "All sellers").text)).state;
  return { sent };
}
