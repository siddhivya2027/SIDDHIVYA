import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isStaff, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { isKind, KINDS, SELLER_READABLE, type Kind } from "@/server/live/docs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Loads documents. Sellers only ever receive their own products, their own seller record and their own settlements. */
export async function GET(request: Request) {
  const me = await requireUser(request);
  if (me instanceof Response) return me;
  const url = new URL(request.url);
  const asked = (url.searchParams.get("kinds") ?? KINDS.join(",")).split(",").filter(isKind) as Kind[];
  const staff = isStaff(me);
  const kinds = staff ? asked : asked.filter((k) => SELLER_READABLE.includes(k));
  const where = staff ? { kind: { in: kinds } } : { kind: { in: kinds }, OR: [{ clientId: me.clientId ?? "-" }, { kind: "seller", id: me.clientId ?? "-" }] };
  const docs = await db().doc.findMany({ where, select: { kind: true, id: true, data: true, updatedAt: true } });
  return Response.json({ docs: docs.map((d) => ({ kind: d.kind, id: d.id, data: d.data, at: d.updatedAt.getTime() })) }, { headers: { "Cache-Control": "no-store" } });
}

const item = z.object({ kind: z.string().refine(isKind), id: z.string().min(1).max(120), clientId: z.string().max(120).nullable().optional(), data: z.unknown() });
const schema = z.object({ upserts: z.array(item).max(200).default([]), deletes: z.array(z.object({ kind: z.string().refine(isKind), id: z.string().min(1).max(120) })).max(200).default([]) });

/** Saves changes from the app (agency team only). Last change wins. */
export async function POST(request: Request) {
  const me = await requireUser(request, true);
  if (me instanceof Response) return me;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Could not read the changes." }, { status: 422 });
  const { upserts, deletes } = parsed.data;
  await db().$transaction([
    ...upserts.map((u) => db().doc.upsert({
      where: { kind_id: { kind: u.kind, id: u.id } },
      create: { kind: u.kind, id: u.id, clientId: u.clientId ?? null, data: u.data as Prisma.InputJsonValue, updatedBy: me.email },
      update: { clientId: u.clientId ?? null, data: u.data as Prisma.InputJsonValue, updatedBy: me.email },
    })),
    ...deletes.map((d) => db().doc.deleteMany({ where: { kind: d.kind, id: d.id } })),
  ]);
  return Response.json({ ok: true, saved: upserts.length, deleted: deletes.length });
}
