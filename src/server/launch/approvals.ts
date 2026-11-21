import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Seller approval links. The agency's browser holds the product; the seller's phone does not. So the link itself
 * carries a short summary of what is being approved, signed with APPROVAL_SECRET so it cannot be changed on the way.
 * When the seller decides, the server returns a short receipt code that only the server can produce. The agency's
 * app checks that code to mark the product approved (or it updates itself when both are in the same browser).
 * Without APPROVAL_SECRET the link still works but is marked "unsigned" (demo use only).
 */
export interface ApprovalSummary {
  v: 1;
  lid: string; // launch id
  seller: string;
  agency: string;
  agencyPhone: string;
  product: string;
  size: string;
  price: number;
  stock: number;
  channels: { id: string; label: string; price: number; profit: number | null }[];
  adsPerDay: number;
  thumb?: string; // tiny JPEG data URL
  exp: number; // ms epoch
}

const secret = () => process.env.APPROVAL_SECRET || "";
export const isSigned = () => secret().length >= 16;
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const mac = (data: string) => createHmac("sha256", secret() || "siddhivya-demo-unsigned").update(data).digest("base64url");

export function signSummary(sum: ApprovalSummary): string {
  const body = b64(JSON.stringify(sum));
  return `${body}.${mac(body)}`;
}

export function readToken(token: string): { ok: true; sum: ApprovalSummary; signed: boolean } | { ok: false; error: string } {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, error: "This approval link is incomplete." };
  const want = mac(body);
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "This approval link was changed or is not valid." };
  let sum: ApprovalSummary;
  try { sum = JSON.parse(unb64(body)); } catch { return { ok: false, error: "This approval link could not be read." }; }
  if (sum.v !== 1) return { ok: false, error: "This approval link is from an older version." };
  if (Date.now() > sum.exp) return { ok: false, error: "This approval link has expired. Ask the agency for a new one." };
  return { ok: true, sum, signed: isSigned() };
}

/** Short code like "A7K3-92QX" proving the decision came through this server. */
export function receiptFor(token: string, decision: "approved" | "changes"): string {
  const r = mac(`${token}|${decision}`).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  return `${r.slice(0, 4)}-${r.slice(4)}`;
}
export function checkReceipt(token: string, decision: "approved" | "changes", receipt: string): boolean {
  return receiptFor(token, decision) === receipt.trim().toUpperCase();
}
