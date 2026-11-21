import { z } from "zod";
import { sendTelegram } from "@/server/launch/notify";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({ text: z.string().min(1).max(4000), chatId: z.string().regex(/^-?\d{3,20}$|^@[A-Za-z0-9_]{4,40}$/).optional().or(z.literal("")) });

/** Sends a Telegram message (alert or daily report). */
export async function POST(request: Request) {
  if (!allow(request, 1, 5)) return Response.json({ state: "failed", error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ state: "failed", error: "Check the message and chat ID." }, { status: 422 });
  return Response.json(await sendTelegram(parsed.data.text, parsed.data.chatId || undefined));
}
