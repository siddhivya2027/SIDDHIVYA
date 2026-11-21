"use client";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { BrandMark } from "@/components/shell/sidebar";
import { Button, Field, Input } from "@/components/ui";
import { BRAND_DEFAULTS } from "@/config/brand";
import { fetchMe, type Me } from "@/lib/live/auth-client";

/** Live sign-in. The first visit after connecting the database creates the owner account. */
export function LiveLogin() {
  const router = useRouter();
  const [me, setMe] = React.useState<Me | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { void fetchMe().then((m) => { if (m.user) router.replace("/launch"); else setMe(m); }); }, [router]);
  const setup = !!me?.setupNeeded;
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(setup ? "/api/auth/setup" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(setup ? { name, email, password } : { email, password }) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(j.error || "Could not sign in.");
      window.location.href = "/launch";
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not sign in."); } finally { setBusy(false); }
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(90%_70%_at_0%_0%,var(--accent-soft),transparent_60%),radial-gradient(80%_60%_at_100%_100%,var(--ai-soft),transparent_60%)] bg-bg px-4">
      <form onSubmit={go} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center gap-2.5"><BrandMark size={34} /><div><p className="text-[17px] font-bold tracking-[0.08em]">{BRAND_DEFAULTS.productName}</p><p className="text-[12px] text-faint">{BRAND_DEFAULTS.tagline}</p></div></div>
        {!me ? <p className="mt-6 text-[13px] text-muted">Checking…</p> : !me.db ? (
          <p className="mt-6 rounded-lg bg-warn-soft p-3 text-[13px] text-warn">The database is not connected yet. In Vercel open the project → Storage → connect Neon, then redeploy.</p>
        ) : (
          <>
            <h1 className="mt-6 text-[20px] font-semibold">{setup ? "Create the owner account" : "Sign in"}</h1>
            <p className="mt-1 text-[13px] text-muted">{setup ? "This is the first sign-in. The owner can add the team and seller logins afterwards." : "Use the email and password the agency gave you."}</p>
            <div className="mt-5 space-y-3">
              {setup && <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></Field>}
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
              <Field label={setup ? "Password (10+ characters)" : "Password"}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={setup ? "new-password" : "current-password"} required minLength={setup ? 10 : 1} /></Field>
            </div>
            {err && <p className="mt-3 text-[13px] text-neg">{err}</p>}
            <Button type="submit" variant="primary" className="mt-5 h-10 w-full" disabled={busy}>{setup ? <LockKeyhole /> : <ArrowRight />}{busy ? "Please wait…" : setup ? "Create owner account" : "Sign in"}</Button>
          </>
        )}
        {BRAND_DEFAULTS.poweredBy.name && <p className="mt-6 text-center text-[11.5px] text-faint">Technology by {BRAND_DEFAULTS.poweredBy.name}</p>}
      </form>
    </main>
  );
}
