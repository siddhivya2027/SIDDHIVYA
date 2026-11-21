import { z } from "zod";
import { checkPassword, sessionCookie } from "@/server/auth";
import { audit, db, hasDb } from "@/server/db";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  if (!allow(request, 0.2, 5)) return Response.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  if (!hasDb()) return Response.json({ error: "Database not connected yet." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your email and password." }, { status: 422 });
  const u = await db().user.findUnique({ where: { email: parsed.data.email } });
  // Same answer for "no such user" and "wrong password", so emails cannot be guessed.
  if (!u || !u.active || !(await checkPassword(parsed.data.password, u.passwordHash))) return Response.json({ error: "Email or password is not right." }, { status: 401 });
  await db().user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await audit(u.name, "Signed in", u.email);
  return Response.json({ ok: true, mustChange: u.mustChange }, { headers: { "Set-Cookie": sessionCookie(u.id) } });
}
