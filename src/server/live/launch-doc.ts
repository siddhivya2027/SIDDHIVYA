import "server-only";
import type { Prisma } from "@prisma/client";
import { db, hasDb } from "@/server/db";
import type { Approval, LaunchProduct } from "@/lib/launch/types";

/** Writes the seller's decision straight into the product's record, so the team sees it without anyone copying codes. */
export async function recordDecision(lid: string, decision: "approved" | "changes", note: string, receipt: string, by: string, onlyClient?: string): Promise<LaunchProduct | null> {
  if (!hasDb()) return null;
  const row = await db().doc.findUnique({ where: { kind_id: { kind: "launch", id: lid } } });
  if (!row) return null;
  const p = row.data as unknown as LaunchProduct;
  if (onlyClient && p.clientId !== onlyClient) return null;
  const approval: Approval = { ...p.approval, state: decision, decidedAt: Date.now(), receipt, note, by };
  const next: LaunchProduct = { ...p, approval, updatedAt: Date.now() };
  await db().doc.update({ where: { kind_id: { kind: "launch", id: lid } }, data: { data: next as unknown as Prisma.InputJsonValue, updatedBy: by } });
  return next;
}
