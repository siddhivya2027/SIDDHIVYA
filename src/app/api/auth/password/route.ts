import { z } from "zod";
import { checkPassword, hashPassword, requireUser } from "@/server/auth";
import { audit, db } from "@/server/db";

export const dynamic = "force-dynamic";
const schema = z.object({ current: z.string().min(1).max(200), next: z.string().min(10).max(200) });

/** Change your own password (also used after the first sign-in with a temporary password). */
export async function POST(request: Request) {
  const me = await requireUser(request);
  if (me instanceof Response) return me;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "The new password needs at least 10 characters." }, { status: 422 });
  const u = await db().user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await checkPassword(parsed.data.current, u.passwordHash))) return Response.json({ error: "The current password is not right." }, { status: 401 });
  await db().user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next), mustChange: false } });
  await audit(me.name, "Changed password", me.email);
  return Response.json({ ok: true });
}
