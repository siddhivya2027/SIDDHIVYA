import { z } from "zod";
import { checkReceipt, readToken } from "@/server/launch/approvals";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({ token: z.string().min(10).max(40_000), receipt: z.string().min(6).max(12), decision: z.enum(["approved", "changes"]) });

/** The agency's app checks a receipt code the seller sent back (by WhatsApp or Telegram). */
export async function POST(request: Request) {
  if (!allow(request, 1, 10)) return Response.json({ ok: false, error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter the 8-character code." }, { status: 422 });
  const t = readToken(parsed.data.token);
  if (!t.ok) return Response.json({ ok: false, error: t.error }, { status: 400 });
  return Response.json({ ok: checkReceipt(parsed.data.token, parsed.data.decision, parsed.data.receipt) });
}
