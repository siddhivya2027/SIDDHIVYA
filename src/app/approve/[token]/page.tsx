"use client";
import { Check, MessageCircle, PencilLine } from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { BrandMark } from "@/components/shell/sidebar";
import { Button, Textarea } from "@/components/ui";
import { patchLaunch } from "@/lib/launch/state";
import { useStore } from "@/lib/store";

interface Summary { lid: string; seller: string; agency: string; agencyPhone: string; product: string; size: string; price: number; stock: number; channels: { id: string; label: string; price: number; profit: number | null }[]; adsPerDay: number; thumb?: string; exp: number }

function decode(token: string): Summary | null {
  try {
    const body = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(body + "===".slice((body.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { return null; }
}
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** The page the seller opens from WhatsApp. Big, simple, one decision. */
export default function ApprovePage() {
  const { token } = useParams<{ token: string }>();
  const sum = React.useMemo(() => decode(decodeURIComponent(token)), [token]);
  const hydrated = useStore((s) => s.hydrated);
  const [mode, setMode] = React.useState<"view" | "changes">("view");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<{ decision: "approved" | "changes"; receipt: string } | null>(null);
  const [err, setErr] = React.useState("");

  if (!sum) return <Shell><p className="text-center text-[15px]">This link could not be opened. Ask the agency to send it again.</p></Shell>;
  const expired = Date.now() > sum.exp;
  const totalProfit = sum.channels.filter((c) => c.profit !== null);

  const decide = async (decision: "approved" | "changes") => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/v1/approvals/decide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: decodeURIComponent(token), decision, note }) });
      const j = (await res.json()) as { ok: boolean; receipt?: string; error?: string };
      if (!j.ok || !j.receipt) throw new Error(j.error || "Could not save your answer.");
      setDone({ decision, receipt: j.receipt });
      // Same browser as the agency (e.g. a demo on one laptop): update the product straight away.
      if (hydrated && useStore.getState().launches.some((l) => l.id === sum.lid)) {
        patchLaunch(sum.lid, (x) => ({ ...x, approval: { ...x.approval, state: decision, receipt: j.receipt, decidedAt: Date.now(), by: sum.seller, note: note || undefined } }));
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };

  if (done) {
    const msg = `${done.decision === "approved" ? "APPROVED" : "CHANGES NEEDED"} — ${sum.product}. Code: ${done.receipt}${note ? `\n${note}` : ""}`;
    return (
      <Shell>
        <div className={`mx-auto flex size-20 items-center justify-center rounded-full ${done.decision === "approved" ? "bg-pos-soft text-pos" : "bg-warn-soft text-warn"}`}>{done.decision === "approved" ? <Check className="size-10" /> : <PencilLine className="size-9" />}</div>
        <h1 className="mt-4 text-center text-[26px] font-bold">{done.decision === "approved" ? "Approved. Thank you!" : "Sent to the team"}</h1>
        <p className="mt-2 text-center text-[15px] text-muted">{done.decision === "approved" ? `${sum.agency} will now put ${sum.product} live on ${sum.channels.length} apps.` : "The team will make the changes and send you a new link."}</p>
        <p className="mt-6 text-center text-[13px] text-muted">Your code</p>
        <p className="tnum text-center text-[34px] font-extrabold tracking-[0.15em]">{done.receipt}</p>
        {sum.agencyPhone && <a href={`https://wa.me/${sum.agencyPhone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="mt-6 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b8a5f] text-[17px] font-semibold text-white"><MessageCircle className="size-5" />Send the code on WhatsApp</a>}
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-center text-[13px] text-muted">{sum.agency} · for {sum.seller}</p>
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        {sum.thumb ? <img src={sum.thumb} alt="" className="size-20 rounded-xl object-cover" /> : <div className="size-20 rounded-xl bg-accent-soft" />}
        <div className="min-w-0">
          <p className="text-[19px] leading-tight font-bold">{sum.product}</p>
          <p className="mt-1 text-[15px] text-muted">{sum.size} · {rs(sum.price)} · {sum.stock} packs</p>
        </div>
      </div>
      <p className="mt-5 text-[14px] font-semibold">It will go live on {sum.channels.length} apps:</p>
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
        {sum.channels.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3 text-[15px]">
            <span className="font-medium">{c.label}</span>
            <span className="text-right">{c.price ? rs(c.price) : ""}{c.profit !== null && <span className={`block text-[12.5px] ${c.profit >= 0 ? "text-pos" : "text-neg"}`}>{c.profit >= 0 ? "profit" : "loss"} {rs(Math.abs(c.profit))} per pack</span>}</span>
          </li>
        ))}
      </ul>
      {sum.adsPerDay > 0 && <p className="mt-3 text-[13.5px] text-muted">Ads: about {rs(sum.adsPerDay)} a day, paid by you to the apps directly.</p>}
      {totalProfit.length === 0 && <p className="mt-3 text-[13px] text-muted">Profit per pack shows when the agency adds your cost.</p>}
      {expired ? <p className="mt-6 rounded-xl bg-warn-soft p-4 text-center text-[15px] text-warn">This link has expired. Ask {sum.agency} for a new one.</p> : mode === "view" ? (
        <div className="mt-6 space-y-3">
          <button type="button" disabled={busy} onClick={() => decide("approved")} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e0781e] via-accent to-[#c2337a] text-[19px] font-extrabold text-white shadow-card disabled:opacity-60"><Check className="size-6" />{busy ? "Saving…" : "APPROVE — ONE CLICK"}</button>
          <Button className="h-12 w-full text-[15px]" onClick={() => setMode("changes")}><PencilLine />I want changes</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change? e.g. price ₹399 on Meesho" className="text-[15px]" />
          <Button variant="primary" className="h-12 w-full text-[15px]" disabled={busy || !note.trim()} onClick={() => decide("changes")}>{busy ? "Sending…" : "Send to the team"}</Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode("view")}>Back</Button>
        </div>
      )}
      {err && <p className="mt-3 text-center text-[14px] text-neg">{err}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2"><BrandMark size={30} /><span className="text-[17px] font-bold tracking-[0.12em]">SIDDHIVYA</span></div>
        {children}
      </div>
    </main>
  );
}
