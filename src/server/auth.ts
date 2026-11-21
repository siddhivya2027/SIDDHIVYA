import "server-only";
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, hasDb } from "./db";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export type LiveRole = "owner" | "manager" | "seller";
export interface SessionUser { id: string; email: string; name: string; role: LiveRole; clientId: string | null; mustChange: boolean }

export const COOKIE = "sv_session";
const MAX_AGE = 14 * 86400; // 14 days

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.APPROVAL_SECRET || "";
  if (s.length < 16) throw new Error("SESSION_SECRET is not set (32+ random characters).");
  return s;
}

/* ---------- Passwords (scrypt, per-user salt) ---------- */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}
export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, k] = stored.split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const want = Buffer.from(k, "base64url");
  const got = await scrypt(pw, Buffer.from(s, "base64url"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}
export function tempPassword(): string {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => a[b % a.length]).join("");
}

/* ---------- Session cookie: uid.exp.signature ---------- */
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
export function sessionCookie(uid: string): string {
  const v = `${uid}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${v}.${sign(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function readCookie(req: Request): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
}

/** The signed-in user, or null. Checks the signature, the expiry and that the user is still active. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  if (!hasDb()) return null;
  const v = readCookie(req);
  if (!v) return null;
  const [uid, exp, sig] = v.split(".");
  if (!uid || !exp || !sig) return null;
  let ok = false;
  try { const want = Buffer.from(sign(`${uid}.${exp}`)); const got = Buffer.from(sig); ok = want.length === got.length && timingSafeEqual(want, got); } catch { return null; }
  if (!ok || Number(exp) * 1000 < Date.now()) return null;
  const u = await db().user.findUnique({ where: { id: uid } });
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as LiveRole, clientId: u.clientId, mustChange: u.mustChange };
}

export const isStaff = (u: SessionUser | null): boolean => !!u && (u.role === "owner" || u.role === "manager");

/** Helper for API routes: returns the user or a ready 401/403 Response. */
export async function requireUser(req: Request, staffOnly = false): Promise<SessionUser | Response> {
  const u = await currentUser(req);
  if (!u) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (staffOnly && !isStaff(u)) return Response.json({ error: "Only the agency team can do this." }, { status: 403 });
  return u;
}
