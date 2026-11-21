import { z } from "zod";
import { readToken, receiptFor } from "@/server/launch/approvals";
import { sendTelegram, sendWebhook } from "@/server/launch/notify";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({ token: z.string().min(10).max(40_000), decision: z.enum(["approved", "changes"]), note: z.string().max(600).default("") });

/** The seller's decision from the approval page. Returns a receipt code and alerts the agency team. */
export async function POST(request: Request) {
  if (!allow(request, 0.5, 5)) return Response.json({ ok: false, error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Something is missing." }, { status: 422 });
  const t = readToken(parsed.data.token);
  if (!t.ok) return Response.json({ ok: false, error: t.error }, { status: 400 });
  const receipt = receiptFor(parsed.data.token, parsed.data.decision);
  const text = parsed.data.decision === "approved"
    ? `✅ ${t.sum.seller} APPROVED ${t.sum.product} (${t.sum.size}) at Rs ${t.sum.price} for ${t.sum.channels.length} channels. Code ${receipt}`
    : `✏️ ${t.sum.seller} asked for changes on ${t.sum.product}: "${parsed.data.note || "no note"}". Code ${receipt}`;
  const [tg, wh] = await Promise.all([sendTelegram(text), sendWebhook(text, { kind: "approval", lid: t.sum.lid, decision: parsed.data.decision, receipt })]);
  return Response.json({ ok: true, receipt, signed: t.signed, notified: tg.state === "sent" || wh === "sent" });
}
