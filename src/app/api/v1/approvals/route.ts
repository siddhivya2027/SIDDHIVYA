import { z } from "zod";
import { isSigned, signSummary } from "@/server/launch/approvals";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  lid: z.string().min(4).max(40), seller: z.string().max(120), agency: z.string().max(120), agencyPhone: z.string().max(20),
  product: z.string().min(1).max(200), size: z.string().max(40), price: z.number().min(0), stock: z.number().int().min(0),
  channels: z.array(z.object({ id: z.string().max(20), label: z.string().max(40), price: z.number().min(0), profit: z.number().nullable() })).max(12),
  adsPerDay: z.number().min(0), thumb: z.string().max(12_000).optional(),
});

/** Creates a signed approval link for the seller. Valid for 7 days. */
export async function POST(request: Request) {
  if (!allow(request, 1, 5)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the product details." }, { status: 422 });
  const token = signSummary({ v: 1, ...parsed.data, exp: Date.now() + 7 * 86400000 });
  return Response.json({ token, signed: isSigned() });
}
