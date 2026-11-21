import { timingSafeEqual } from "node:crypto";
import { hasDb } from "@/server/db";
import { syncAll } from "@/server/live/orders-sync";
import { sendAllReports } from "@/server/live/report";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs every morning (vercel.json → crons). Vercel sends "Authorization: Bearer <CRON_SECRET>".
 * 1) fetch new Amazon orders for every seller  2) send each seller + the agency the daily Telegram report.
 */
export async function GET(request: Request) {
  const want = process.env.CRON_SECRET || "";
  const got = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const ok = want.length >= 16 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 401 });
  if (!hasDb()) return Response.json({ error: "Database not connected" }, { status: 503 });
  const orders = await syncAll();
  const reports = await sendAllReports();
  return Response.json({ ok: true, orders, reports });
}
