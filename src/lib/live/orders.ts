"use client";
import * as React from "react";
import { profitOn } from "@/lib/launch/engine";
import { SETTLE_AFTER, type Order } from "@/lib/launch/orders";
import type { ChannelId, LaunchProduct } from "@/lib/launch/types";
import { useStore } from "@/lib/store";
import { LIVE } from "./mode";

interface Row { id: string; clientId: string; channel: string; orderId: string; ts: number; status: string; qty: number; sale: number; sku: string | null }
const DAY = 86400000;

/** Real orders from the database, matched to products by SKU. Fees are worked out from each app's fee rules (estimate until the settlement file is imported). */
export function toOrders(rows: Row[], launches: LaunchProduct[]): Order[] {
  return rows.filter((r) => !/cancel/i.test(r.status)).map((r) => {
    const p = launches.find((l) => l.clientId === r.clientId && l.sku && l.sku === r.sku);
    const l = p?.listings.find((x) => x.channel === r.channel);
    const f = p && l ? profitOn(p, l) : null;
    const unit = r.qty ? r.sale / r.qty : r.sale;
    const payout = f && l?.price ? (f.payout / l.price) * unit * r.qty : r.sale;
    return { id: r.id, orderId: r.orderId, status: r.status, launchId: p?.id ?? "", clientId: r.clientId, channel: r.channel as ChannelId, ts: r.ts, qty: r.qty, sale: r.sale, fees: r.sale - payout, payout, payoutOn: r.ts + (SETTLE_AFTER[r.channel as ChannelId] ?? 7) * DAY, sample: false };
  });
}

export function useLiveOrders(clientId?: string) {
  const launches = useStore((s) => s.launches);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!LIVE) return;
    let off = false;
    void fetch(`/api/v1/orders${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : { orders: [] })).then((j: { orders?: Row[] }) => { if (!off) setRows(j.orders ?? []); }).catch(() => null);
    return () => { off = true; };
  }, [clientId, tick]);
  const orders = React.useMemo(() => toOrders(rows, launches), [rows, launches]);
  return { orders, reload: () => setTick((t) => t + 1) };
}
