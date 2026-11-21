import { z } from "zod";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/db";
import { sendTelegram } from "@/server/launch/notify";
import { recordDecision } from "@/server/live/launch-doc";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
const schema = z.object({ lid: z.string().min(1).max(80), decision: z.enum(["approved", "changes"]), note: z.string().max(600).default("") });

/** A signed-in seller approves (or asks changes on) their own product inside the app. */
export async function POST(request: Request) {
  const u = await requireUser(request); if (u instanceof Response) return u;
  if (u.role !== "seller" || !u.clientId) return Response.json({ error: "Only the seller can approve here." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Something is missing." }, { status: 422 });
  const receipt = `IN-${randomBytes(3).toString("hex").toUpperCase()}`;
  const p = await recordDecision(parsed.data.lid, parsed.data.decision, parsed.data.note, receipt, u.name, u.clientId);
  if (!p) return Response.json({ error: "Product not found." }, { status: 404 });
  await audit(u.email, `approval.${parsed.data.decision}`, p.id);
  await sendTelegram(parsed.data.decision === "approved" ? `✅ ${u.name} APPROVED ${p.name} (${p.size}) in the app. Code ${receipt}` : `✏️ ${u.name} asked for changes on ${p.name}: "${parsed.data.note || "no note"}". Code ${receipt}`);
  return Response.json({ ok: true, receipt, launch: p });
}
