import { z } from "zod";
import { audit } from "@/server/db";
import { requireUser } from "@/server/auth";
import { channelEnv } from "@/server/launch/publishers";
import { canSeal, CONNECTABLE, credsFor, keysFor, savedKeyNames, saveKeys } from "@/server/live/secrets";

export const dynamic = "force-dynamic";

/** GET ?clientId= → for each channel: which keys are needed, which the seller saved, and whether it is switched on. Names only. */
export async function GET(request: Request) {
  const u = await requireUser(request, true); if (u instanceof Response) return u;
  const clientId = new URL(request.url).searchParams.get("clientId") || "";
  if (!clientId) return Response.json({ error: "clientId missing" }, { status: 400 });
  const [saved, creds] = await Promise.all([savedKeyNames(clientId), credsFor(clientId)]);
  const status = channelEnv(creds);
  const channels = Object.fromEntries(CONNECTABLE.map((ch) => [ch, { keys: keysFor(ch), saved: saved[ch]?.names ?? [], savedAt: saved[ch]?.updatedAt ?? null, fromServer: keysFor(ch).filter((k) => !!process.env[k]), configured: status[ch]?.configured ?? false, missing: status[ch]?.missing ?? [] }]));
  return Response.json({ canSave: canSeal(), channels }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({ clientId: z.string().min(1).max(80), channel: z.enum(CONNECTABLE), values: z.record(z.string().regex(/^[A-Z][A-Z0-9_]{2,40}$/), z.string().max(4000)) });

/** Save one channel's keys for one seller. Only the owner or team can do this; values are locked before storage. */
export async function POST(request: Request) {
  const u = await requireUser(request, true); if (u instanceof Response) return u;
  if (!canSeal()) return Response.json({ error: "TOKEN_ENCRYPTION_KEY is not set in Vercel yet, so keys cannot be stored safely." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the key names." }, { status: 422 });
  const allowed = new Set(keysFor(parsed.data.channel));
  const bad = Object.keys(parsed.data.values).filter((k) => !allowed.has(k));
  if (bad.length) return Response.json({ error: `Not a ${parsed.data.channel} key: ${bad.join(", ")}` }, { status: 422 });
  await saveKeys(parsed.data.clientId, parsed.data.channel, parsed.data.values, u.email);
  await audit(u.email, "connection.save", `${parsed.data.clientId}:${parsed.data.channel}:${Object.keys(parsed.data.values).join(",")}`);
  return Response.json({ ok: true });
}
