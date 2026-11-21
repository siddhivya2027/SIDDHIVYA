import { z } from "zod";
import { hashPassword, requireUser, tempPassword } from "@/server/auth";
import { audit, db } from "@/server/db";

export const dynamic = "force-dynamic";
const pub = { id: true, email: true, name: true, role: true, clientId: true, active: true, createdAt: true, lastLoginAt: true, mustChange: true } as const;

export async function GET(request: Request) {
  const me = await requireUser(request, true);
  if (me instanceof Response) return me;
  return Response.json({ users: await db().user.findMany({ select: pub, orderBy: { createdAt: "asc" } }) });
}

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), role: z.enum(["manager", "seller"]), clientId: z.string().max(60).optional() });

/** Adds a team member or a seller login with a temporary password (shown once). */
export async function POST(request: Request) {
  const me = await requireUser(request, true);
  if (me instanceof Response) return me;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Name, a valid email and a role are needed." }, { status: 422 });
  if (parsed.data.role === "seller" && !parsed.data.clientId) return Response.json({ error: "Choose which seller this login is for." }, { status: 422 });
  if (await db().user.findUnique({ where: { email: parsed.data.email } })) return Response.json({ error: "That email already has a login." }, { status: 409 });
  const pw = tempPassword();
  const u = await db().user.create({ data: { ...parsed.data, clientId: parsed.data.role === "seller" ? parsed.data.clientId : null, passwordHash: await hashPassword(pw), mustChange: true }, select: pub });
  await audit(me.name, `Added ${parsed.data.role} login`, u.email);
  return Response.json({ user: u, tempPassword: pw });
}
