import { z } from "zod";
import { hashPassword, requireUser, tempPassword } from "@/server/auth";
import { audit, db } from "@/server/db";

export const dynamic = "force-dynamic";
const schema = z.object({ action: z.enum(["reset_password", "deactivate", "activate"]) });

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireUser(request, true);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown action." }, { status: 422 });
  const u = await db().user.findUnique({ where: { id } });
  if (!u) return Response.json({ error: "Login not found." }, { status: 404 });
  if (u.role === "owner" && me.role !== "owner") return Response.json({ error: "Only the owner can change the owner's login." }, { status: 403 });
  if (u.id === me.id && parsed.data.action === "deactivate") return Response.json({ error: "You cannot switch off your own login." }, { status: 422 });
  if (parsed.data.action === "reset_password") {
    const pw = tempPassword();
    await db().user.update({ where: { id }, data: { passwordHash: await hashPassword(pw), mustChange: true } });
    await audit(me.name, "Reset password", u.email);
    return Response.json({ ok: true, tempPassword: pw });
  }
  await db().user.update({ where: { id }, data: { active: parsed.data.action === "activate" } });
  await audit(me.name, parsed.data.action === "activate" ? "Switched login on" : "Switched login off", u.email);
  return Response.json({ ok: true });
}
