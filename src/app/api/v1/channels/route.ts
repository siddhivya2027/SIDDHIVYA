import { channelEnv } from "@/server/launch/publishers";
import { isSigned } from "@/server/launch/approvals";
import { currentUser, isStaff } from "@/server/auth";
import { hasDb } from "@/server/db";
import { credsFor } from "@/server/live/secrets";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Which channels are switched on (keys present) — for one seller when ?clientId= is given. Names of missing keys only. */
export async function GET(request: Request) {
  if (!allow(request)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const clientId = new URL(request.url).searchParams.get("clientId");
  let creds: Record<string, string | undefined> = process.env;
  if (hasDb()) {
    const u = await currentUser(request);
    if (!u) return Response.json({ error: "Sign in first." }, { status: 401 });
    const cid = isStaff(u) ? clientId : u.clientId;
    creds = await credsFor(cid);
  }
  return Response.json({ demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false", signedApprovals: isSigned(), channels: channelEnv(creds) }, { headers: { "Cache-Control": "no-store" } });
}
