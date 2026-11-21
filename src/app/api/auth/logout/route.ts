import { clearCookie } from "@/server/auth";

export const dynamic = "force-dynamic";
export function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } });
}
