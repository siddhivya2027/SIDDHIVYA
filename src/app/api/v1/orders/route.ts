import { requireUser, isStaff } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** Real orders stored in the database. Sellers see only their own. ?days= (default 90). */
export async function GET(request: Request) {
  const u = await requireUser(request); if (u instanceof Response) return u;
  const sp = new URL(request.url).searchParams;
  const days = Math.min(400, Math.max(1, Number(sp.get("days")) || 90));
  const clientId = isStaff(u) ? sp.get("clientId") || undefined : u.clientId ?? "__none__";
  const rows = await db().order.findMany({ where: { ...(clientId ? { clientId } : {}), ts: { gte: new Date(Date.now() - days * 86400000) } }, orderBy: { ts: "desc" }, take: 5000, select: { id: true, clientId: true, channel: true, orderId: true, ts: true, status: true, qty: true, sale: true, sku: true } });
  return Response.json({ orders: rows.map((r) => ({ ...r, ts: r.ts.getTime() })) }, { headers: { "Cache-Control": "no-store" } });
}
