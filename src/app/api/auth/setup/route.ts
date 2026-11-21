import { z } from "zod";
import { hashPassword, sessionCookie } from "@/server/auth";
import { audit, db, hasDb } from "@/server/db";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(10).max(200) });

/** Creates the very first account (the owner). Works only while there are no users at all. */
export async function POST(request: Request) {
  if (!allow(request, 0.2, 3)) return Response.json({ error: "Too many tries. Wait a minute." }, { status: 429 });
  if (!hasDb()) return Response.json({ error: "Database not connected yet." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Name, a valid email and a password of at least 10 characters are needed." }, { status: 422 });
  const count = await db().user.count();
  if (count > 0) return Response.json({ error: "The owner account already exists. Sign in instead." }, { status: 409 });
  const u = await db().user.create({ data: { name: parsed.data.name, email: parsed.data.email, role: "owner", passwordHash: await hashPassword(parsed.data.password), lastLoginAt: new Date() } });
  await audit(u.name, "Created owner account", u.email);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(u.id) } });
}
