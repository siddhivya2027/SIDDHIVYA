/**
 * Orders and money coming back. Live order feeds need each channel's order API connected; until then this module
 * produces clearly-labelled SAMPLE orders for products that went live (so the full loop can be shown), and reads
 * REAL settlement files the team downloads from each seller dashboard (CSV import).
 */
import { rnd } from "@/lib/demo/generate";
import { LIVE } from "@/lib/live/mode";
import { CH } from "./channels";
import { profitOn } from "./engine";
import type { ChannelId, LaunchProduct, ManualOrder, Settlement } from "./types";

export interface Order { id: string; launchId: string; clientId: string; channel: ChannelId; ts: number; qty: number; sale: number; fees: number; payout: number; payoutOn: number; sample: boolean; status?: string; orderId?: string }

const RATE: Partial<Record<ChannelId, number>> = { amazon: 6, flipkart: 4, meesho: 5, blinkit: 7, zepto: 5, instamart: 4 }; // sample orders per day
const SETTLE_DAYS: Partial<Record<ChannelId, number>> = { amazon: 7, flipkart: 10, meesho: 7, blinkit: 15, zepto: 15, instamart: 15 };
const DAY = 86400000;

/** Orders typed in by hand. Direct sales (WhatsApp / phone / shop) are paid on the spot; app orders follow the app's payout days. */
export function manualToOrders(list: ManualOrder[]): Order[] {
  return list.map((m) => {
    const direct = CH[m.channel]?.kind === "social";
    return { id: m.id, orderId: m.note ? `${m.id} · ${m.note}` : m.id, status: "By hand", launchId: m.launchId, clientId: m.clientId, channel: m.channel, ts: m.ts, qty: m.qty, sale: m.sale, fees: m.fees, payout: m.sale - m.fees, payoutOn: direct ? m.ts : m.ts + (SETTLE_DAYS[m.channel] ?? 7) * DAY, sample: false };
  }).sort((a, b) => b.ts - a.ts);
}

export function sampleOrders(p: LaunchProduct, now = Date.now()): Order[] {
  if (LIVE || !p.liveSince) return []; // live mode shows only real orders
  const out: Order[] = [];
  for (const l of p.listings) {
    const j = p.jobs[l.channel];
    if (!l.enabled || !j || !(j.state === "live" || j.state === "demo_live" || j.state === "uploaded")) continue;
    const rate = RATE[l.channel];
    if (!rate) continue;
    const start = Math.max(p.liveSince, j.ts);
    const days = (now - start) / DAY + 1; // first day's orders show straight away in the demo
    const n = Math.min(Math.floor(days * rate), 400);
    const f = profitOn(p, l);
    for (let i = 0; i < n; i++) {
      const k = `${p.id}${l.channel}${i}`;
      const ts = Math.min(now, start + (i / rate) * DAY + rnd(k) * (DAY / rate));
      const qty = rnd(k + "q") > 0.8 ? 2 : 1;
      const sale = l.price * qty;
      const payout = (f ? f.payout : l.price) * qty;
      out.push({ id: `S-${p.id.slice(0, 4).toUpperCase()}-${l.channel.slice(0, 2).toUpperCase()}${String(i + 1).padStart(4, "0")}`, launchId: p.id, clientId: p.clientId, channel: l.channel, ts, qty, sale, fees: sale - payout, payout, payoutOn: ts + (SETTLE_DAYS[l.channel] ?? 7) * DAY, sample: true });
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export const SETTLE_AFTER = SETTLE_DAYS;
export const unitsSold = (orders: Order[], launchId: string) => orders.filter((o) => o.launchId === launchId).reduce((a, o) => a + o.qty, 0);

/* ---------- Settlement file import (real data) ---------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const money = (s: string) => Number(String(s).replace(/[^\d.-]/g, "")) || 0;
const findCol = (head: string[], names: string[]) => head.findIndex((h) => names.some((n) => h.toLowerCase().replace(/[^a-z]/g, "").includes(n)));

/**
 * Reads a settlement / payments CSV. Column names differ by marketplace, so it looks for the usual ones:
 * date, order id, sale (or amount / gross), fees (or commission / charges), payout (or net / settlement).
 */
export function importSettlements(text: string, clientId: string, channel: ChannelId): { rows: Settlement[]; skipped: number; error?: string } {
  const all = parseCsv(text);
  const hi = all.findIndex((r) => findCol(r, ["orderid", "orderitemid", "order"]) >= 0 && findCol(r, ["date"]) >= 0);
  if (hi < 0) return { rows: [], skipped: 0, error: "Could not find a header row with an order ID and a date column." };
  const head = all[hi];
  const c = { date: findCol(head, ["date"]), order: findCol(head, ["orderid", "orderitemid", "order"]), sale: findCol(head, ["sale", "gross", "amount", "itemprice", "invoice"]), fees: findCol(head, ["fee", "commission", "charge"]), payout: findCol(head, ["payout", "net", "settle", "bankamount", "total"]) };
  const rows: Settlement[] = []; let skipped = 0;
  for (const r of all.slice(hi + 1)) {
    const order = r[c.order]?.trim();
    const d = new Date(r[c.date] ?? "");
    if (!order || isNaN(d.getTime())) { skipped++; continue; }
    const sale = c.sale >= 0 ? money(r[c.sale]) : 0;
    const payout = c.payout >= 0 ? money(r[c.payout]) : 0;
    const fees = c.fees >= 0 ? Math.abs(money(r[c.fees])) : Math.max(0, sale - payout);
    rows.push({ id: `${channel}-${order}`, clientId, channel, date: d.toISOString().slice(0, 10), orderId: order, sale, fees, payout: payout || sale - fees, source: "imported" });
  }
  return { rows, skipped };
}

export const CHANNEL_SETTLES = (ch: ChannelId) => `${CH[ch].label} usually pays about ${SETTLE_DAYS[ch] ?? 7} days after delivery.`;
