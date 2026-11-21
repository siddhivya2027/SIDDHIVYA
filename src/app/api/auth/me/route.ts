import { currentUser } from "@/server/auth";
import { db, hasDb } from "@/server/db";

export const dynamic = "force-dynamic";

/** Who is signed in, and whether the first owner account still has to be created. */
export async function GET(request: Request) {
  if (!hasDb()) return Response.json({ db: false, user: null, setupNeeded: false });
  try {
    const user = await currentUser(request);
    const setupNeeded = user ? false : (await db().user.count()) === 0;
    return Response.json({ db: true, user, setupNeeded }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ db: true, user: null, setupNeeded: false, error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}
