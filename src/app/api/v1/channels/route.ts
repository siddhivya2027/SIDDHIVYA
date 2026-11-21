import { channelEnv, } from "@/server/launch/publishers";
import { isSigned } from "@/server/launch/approvals";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Which channels are switched on (keys present). Names of missing keys only — never values. */
export function GET(request: Request) {
  if (!allow(request)) return Response.json({ error: "Too many requests" }, { status: 429 });
  return Response.json({ demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false", signedApprovals: isSigned(), channels: channelEnv() }, { headers: { "Cache-Control": "no-store" } });
}
