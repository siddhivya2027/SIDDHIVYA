"use client";
import { inr } from "@/lib/format";
import { useStore } from "@/lib/store";
import { CH } from "./channels";
import { sampleOrders, unitsSold } from "./orders";
import { notifyTelegram } from "./publish-client";

/** Plain-words daily report for one seller (or the whole agency when clientId is undefined). */
export function dailyReportText(clientId?: string, sellerName = "All sellers"): string {
  const st = useStore.getState();
  const launches = st.launches.filter((l) => !clientId || l.clientId === clientId);
  const since = Date.now() - 86400000;
  const orders = launches.flatMap((p) => sampleOrders(p)).filter((o) => o.ts >= since);
  const imported = st.settlements.filter((s) => (!clientId || s.clientId === clientId) && new Date(s.date).getTime() >= since);
  const sales = orders.reduce((a, o) => a + o.sale, 0) + imported.reduce((a, o) => a + o.sale, 0);
  const toBank = orders.reduce((a, o) => a + o.payout, 0) + imported.reduce((a, o) => a + o.payout, 0);
  const byApp = Object.entries(orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.channel]: (m[o.channel] ?? 0) + 1 }), {})).map(([k, n]) => `${CH[k as keyof typeof CH].label} ${n}`).join(", ");
  const all = launches.flatMap((p) => sampleOrders(p));
  const low = launches.filter((p) => p.liveSince && p.stock - unitsSold(all, p.id) <= st.alertRules.lowStockUnits).map((p) => `${p.name} (${Math.max(0, p.stock - unitsSold(all, p.id))} left)`);
  const waiting = launches.filter((p) => p.approval.state === "sent").map((p) => p.name);
  return [
    `📊 SIDDHIVYA daily report — ${sellerName}`,
    `Last 24 hours: ${orders.length + imported.length} orders, sales ${inr(sales)}, to bank ${inr(toBank)}.`,
    byApp ? `By app: ${byApp}.` : "",
    low.length ? `⚠️ Running low: ${low.join("; ")}.` : "Stock: all fine.",
    waiting.length ? `⏳ Waiting for approval: ${waiting.join(", ")}.` : "",
    orders.length ? "(Includes sample orders from demo mode.)" : "",
  ].filter(Boolean).join("\n");
}

/** Sends the daily report to every seller who has a Telegram chat ID, plus the agency team. */
export async function sendDailyReports() {
  const st = useStore.getState();
  const sellers = new Set(st.launches.map((l) => l.clientId));
  for (const id of sellers) {
    const chat = st.sellerSetup[id]?.telegramChatId;
    if (chat) await notifyTelegram(dailyReportText(id, st.launches.find((l) => l.clientId === id)?.brand ?? id), chat);
  }
  await notifyTelegram(dailyReportText(undefined, "Agency"));
  useStore.setState((s) => ({ alertRules: { ...s.alertRules, lastDailyReport: new Date().toISOString().slice(0, 10) } }));
}
