"use client";
import { KeyRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@/components/shared";
import { Button, Field, Input, Modal } from "@/components/ui";
import { fetchMe, toSession, type MeUser } from "@/lib/live/auth-client";
import { startSync } from "@/lib/live/sync";
import { useStore } from "@/lib/store";

/** Pages that run on generated sample numbers. In live mode they are not shown; the app opens on One-Click Launch. */
export const DEMO_ONLY = ["/overview", "/ai", "/marketplaces", "/meta-ads", "/advertising", "/sales", "/products", "/reports", "/clients", "/settings"];
/** Pages a seller login may open. */
const SELLER_OK = ["/launch", "/orders"];

/** Live mode: checks the real login, loads the data, keeps it saved. Children render only when ready. */
export function LiveGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = React.useState<MeUser | null>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const me = await fetchMe();
      if (!alive) return;
      if (!me.user) { router.replace("/login"); return; }
      useStore.setState({ session: toSession(me.user) });
      setUser(me.user);
      await startSync(me.user.role !== "seller");
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, [router]);
  React.useEffect(() => {
    if (!ready || !user) return;
    if (DEMO_ONLY.some((p) => path === p || path.startsWith(p + "/"))) router.replace("/launch");
    else if (user.role === "seller" && !SELLER_OK.some((p) => path === p || path.startsWith(p + "/"))) router.replace("/launch");
  }, [ready, user, path, router]);
  if (!ready || !user) return <>{fallback}</>;
  return <>{children}{user.mustChange && <ChangePassword forced />}</>;
}

export function ChangePassword({ forced, onDone }: { forced?: boolean; onDone?: () => void }) {
  const [open, setOpen] = React.useState(true);
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: cur, next }) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(j.error || "Could not change it.");
      toast("Password changed."); setOpen(false); onDone?.();
    } catch (e) { toast(e instanceof Error ? e.message : "Could not change it.", "error"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={(o) => { if (!forced) { setOpen(o); if (!o) onDone?.(); } }} title={forced ? "Set your own password" : "Change password"} description={forced ? "You signed in with a temporary password. Choose your own now (10+ characters)." : undefined}
      footer={<Button variant="primary" onClick={save} disabled={busy || next.length < 10 || !cur}><KeyRound />{busy ? "Saving…" : "Save password"}</Button>}>
      <div className="space-y-3">
        <Field label={forced ? "Temporary password" : "Current password"}><Input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password (10+ characters)"><Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
