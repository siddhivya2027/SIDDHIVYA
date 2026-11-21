import { z } from "zod";
import { currentUser, isStaff } from "@/server/auth";
import { audit, hasDb } from "@/server/db";
import { publish, publishSchema } from "@/server/launch/publishers";
import { credsFor } from "@/server/live/secrets";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const body = publishSchema.extend({ clientId: z.string().max(80).optional() });

/** Sends one product to one channel that has an open API, using that seller's own keys. Team logins only (in live). */
export async function POST(request: Request) {
  if (!allow(request, 2, 10)) return Response.json({ state: "failed", message: "Too many requests — wait a few seconds." }, { status: 429 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ state: "failed", message: "Send JSON." }, { status: 400 }); }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return Response.json({ state: "failed", message: `Check the listing: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ").slice(0, 300)}` }, { status: 422 });
  const { clientId, ...req } = parsed.data;
  let creds: Record<string, string | undefined> = process.env;
  if (hasDb()) {
    const u = await currentUser(request);
    if (!u || !isStaff(u)) return Response.json({ state: "failed", message: "Only the agency team can publish." }, { status: 403 });
    if (!clientId) return Response.json({ state: "failed", message: "Which seller is this for?" }, { status: 422 });
    creds = await credsFor(clientId);
    const res = await publish(req, creds);
    await audit(u.email, `publish.${req.channel}.${res.state}`, `${clientId}:${req.product.sku || req.product.name}`);
    return Response.json(res, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(await publish(req, creds), { headers: { "Cache-Control": "no-store" } });
}
