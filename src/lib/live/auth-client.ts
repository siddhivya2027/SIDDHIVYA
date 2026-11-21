"use client";
import { useStore, type Role, type Session } from "@/lib/store";

export interface MeUser { id: string; email: string; name: string; role: "owner" | "manager" | "seller"; clientId: string | null; mustChange: boolean }
export interface Me { db: boolean; user: MeUser | null; setupNeeded: boolean; error?: string }

export async function fetchMe(): Promise<Me> {
  try { const r = await fetch("/api/auth/me", { cache: "no-store" }); return (await r.json()) as Me; } catch { return { db: false, user: null, setupNeeded: false, error: "No connection" }; }
}
const ROLE: Record<MeUser["role"], Role> = { owner: "admin", manager: "manager", seller: "viewer" };
export function toSession(u: MeUser): Session { return { name: u.name, email: u.email, role: ROLE[u.role], uid: u.id, clientId: u.clientId, live: true }; }
export const isSellerLogin = (s: Session | null) => !!s?.live && s.role === "viewer";

/** Signs out and clears this browser's working copy, so the next person on this computer sees nothing of it. */
export async function liveSignOut() {
  try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
  useStore.setState({ session: null, launches: [], customClients: [], sellerSetup: {}, optIns: [], settlements: [], visibility: [], alertLog: [], siteLeads: [] });
  try { localStorage.removeItem("siddhivya-demo-v1"); } catch { /* ignore */ }
  window.location.href = "/login";
}
