import { z } from "zod";
import { requireUser } from "@/server/auth";
import { syncAll } from "@/server/live/orders-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Fetch orders now" button — team only. */
export async function POST(request: Request) {
  const u = await requireUser(request, true); if (u instanceof Response) return u;
  const b = z.object({ clientId: z.string().max(80).optional() }).safeParse(await request.json().catch(() => ({})));
  return Response.json({ ok: true, result: await syncAll(b.success ? b.data.clientId : undefined) });
}
