import "server-only";
import { db, hasDb } from "@/server/db";
import { open, seal } from "@/server/connectors/token-vault";
import { CHANNEL_KEYS, type Creds } from "@/server/launch/publishers";

/**
 * Each seller's own channel keys (their Amazon, Flipkart, Facebook Page…), locked with AES-256-GCM before they are
 * stored. Keys set in Vercel act as the agency default; a seller's saved key wins over the default.
 * Values are only ever opened inside the server to call a channel — never sent back to a browser.
 */
export const CONNECTABLE = ["amazon", "flipkart", "facebook", "instagram", "whatsapp", "telegram"] as const;
export type Connectable = (typeof CONNECTABLE)[number];
/** Extra non-required keys a seller may also save. */
export const OPTIONAL_KEYS: Partial<Record<Connectable, string[]>> = { whatsapp: ["WHATSAPP_TEMPLATE_LANG"], telegram: ["TELEGRAM_CHAT_ID"] };
export const keysFor = (ch: Connectable) => [...new Set([...(CHANNEL_KEYS[ch] ?? []), ...(OPTIONAL_KEYS[ch] ?? [])])];
export const canSeal = () => { const k = process.env.TOKEN_ENCRYPTION_KEY; return !!k && Buffer.from(k, "base64").length === 32; };

async function rows(clientId: string) {
  if (!hasDb()) return [];
  return db().secret.findMany({ where: { clientId } });
}

/** Server defaults merged with the seller's saved keys. */
export async function credsFor(clientId: string | null | undefined): Promise<Creds> {
  const c: Creds = { ...process.env };
  if (!clientId || !canSeal()) return c;
  for (const r of await rows(clientId)) {
    try { Object.assign(c, JSON.parse(open(r.sealed)) as Record<string, string>); } catch { /* wrong key or damaged row — fall back to defaults */ }
  }
  return c;
}

/** Which key NAMES this seller has saved per channel (never values). */
export async function savedKeyNames(clientId: string): Promise<Record<string, { names: string[]; updatedAt: string }>> {
  const out: Record<string, { names: string[]; updatedAt: string }> = {};
  if (!canSeal()) return out;
  for (const r of await rows(clientId)) {
    try { out[r.channel] = { names: Object.keys(JSON.parse(open(r.sealed)) as object), updatedAt: r.updatedAt.toISOString() }; } catch { out[r.channel] = { names: [], updatedAt: r.updatedAt.toISOString() }; }
  }
  return out;
}

/** Save (merge) keys for one seller + channel. Empty strings remove a key. */
export async function saveKeys(clientId: string, channel: Connectable, values: Record<string, string>, by: string) {
  const id = `${clientId}:${channel}`;
  const prev = await db().secret.findUnique({ where: { id } });
  const cur: Record<string, string> = prev ? (() => { try { return JSON.parse(open(prev.sealed)) as Record<string, string>; } catch { return {}; } })() : {};
  for (const [k, v] of Object.entries(values)) { if (v.trim()) cur[k] = v.trim(); else delete cur[k]; }
  if (!Object.keys(cur).length) { await db().secret.deleteMany({ where: { id } }); return; }
  const sealed = seal(JSON.stringify(cur));
  await db().secret.upsert({ where: { id }, create: { id, clientId, channel, sealed, updatedBy: by }, update: { sealed, updatedBy: by } });
}
