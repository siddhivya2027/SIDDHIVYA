import { publish, publishSchema } from "@/server/launch/publishers";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sends one product to one channel that has an open API. Called once per channel by the One-Click Launch screen. */
export async function POST(request: Request) {
  if (!allow(request, 2, 10)) return Response.json({ state: "failed", message: "Too many requests — wait a few seconds." }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ state: "failed", message: "Send JSON." }, { status: 400 }); }
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) return Response.json({ state: "failed", message: `Check the listing: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ").slice(0, 300)}` }, { status: 422 });
  return Response.json(await publish(parsed.data), { headers: { "Cache-Control": "no-store" } });
}
