import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { amazonToken, call, type Creds } from "@/server/launch/publishers";
import { credsFor } from "@/server/live/secrets";

/**
 * Pulls real orders from Amazon (Selling Partner API → Orders) into the database, per seller, using that seller's keys.
 * Flipkart, Meesho and the quick-delivery apps: their order/settlement files are imported on the Orders page.
 */
const MP = "A21TJRUUN4KGV";
const SP = "https://sellingpartnerapi-eu.amazon.com";
const AMAZON_KEYS = ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_REFRESH_TOKEN", "AMAZON_SELLER_ID"];

interface AmzOrder { AmazonOrderId: string; PurchaseDate: string; OrderStatus: string; OrderTotal?: { Amount: string }; NumberOfItemsShipped?: number; NumberOfItemsUnshipped?: number }
interface AmzItem { SellerSKU?: string; QuantityOrdered: number; ItemPrice?: { Amount: string } }

export async function syncAmazon(clientId: string, c: Creds, days = 3): Promise<{ state: "ok" | "not_connected" | "failed"; added: number; message: string }> {
  if (AMAZON_KEYS.some((k) => !c[k])) return { state: "not_connected", added: 0, message: "Amazon keys not added for this seller." };
  try {
    const token = await amazonToken(c);
    const after = new Date(Date.now() - days * 86400000).toISOString();
    const list = await call<{ payload?: { Orders?: AmzOrder[] } }>(`${SP}/orders/v0/orders?MarketplaceIds=${MP}&LastUpdatedAfter=${encodeURIComponent(after)}`, { method: "GET", headers: { "x-amz-access-token": token } });
    const orders = list.payload?.Orders ?? [];
    const known = new Set((await db().order.findMany({ where: { id: { in: orders.map((o) => `amazon:${o.AmazonOrderId}`) } }, select: { id: true, status: true } })).map((r) => `${r.id}|${r.status}`));
    let added = 0;
    for (const o of orders.slice(0, 40)) { // item calls are rate-limited by Amazon; the next run picks up the rest
      const id = `amazon:${o.AmazonOrderId}`;
      if (known.has(`${id}|${o.OrderStatus}`)) continue;
      let sku: string | null = null, qty = (o.NumberOfItemsShipped ?? 0) + (o.NumberOfItemsUnshipped ?? 0) || 1;
      try {
        const it = await call<{ payload?: { OrderItems?: AmzItem[] } }>(`${SP}/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems`, { method: "GET", headers: { "x-amz-access-token": token } });
        const items = it.payload?.OrderItems ?? [];
        sku = items[0]?.SellerSKU ?? null; qty = items.reduce((a, x) => a + (x.QuantityOrdered || 0), 0) || qty;
      } catch { /* keep the order without item detail */ }
      const data = { clientId, channel: "amazon", orderId: o.AmazonOrderId, ts: new Date(o.PurchaseDate), status: o.OrderStatus, qty, sale: Number(o.OrderTotal?.Amount ?? 0), sku, raw: o as unknown as Prisma.InputJsonValue };
      await db().order.upsert({ where: { id }, create: { id, ...data }, update: data });
      added++;
    }
    return { state: "ok", added, message: `${orders.length} Amazon orders checked, ${added} new or changed.` };
  } catch (e) {
    return { state: "failed", added: 0, message: e instanceof Error ? e.message.slice(0, 300) : "Amazon order sync failed" };
  }
}

/** Every seller that has a seller doc. */
export async function allSellerIds(): Promise<string[]> {
  return (await db().doc.findMany({ where: { kind: "seller" }, select: { id: true } })).map((d) => d.id);
}

export async function syncAll(only?: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of only ? [only] : await allSellerIds()) out[id] = (await syncAmazon(id, await credsFor(id))).message;
  return out;
}
