"use client";
import { Check, Pencil } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/shared";
import { APPROVAL, ChannelDots, JobBadge, PhotoThumb } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, Field, Textarea } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { inr } from "@/lib/format";
import { CH } from "@/lib/launch/channels";
import { adAmounts, profitOn } from "@/lib/launch/engine";
import type { LaunchProduct } from "@/lib/launch/types";
import { useStore } from "@/lib/store";

/** What a seller sees for one of their products: price and profit on every app, where it is live, and approve / ask changes. */
export function SellerProductView({ p }: { p: LaunchProduct }) {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const on = p.listings.filter((l) => l.enabled);
  const ads = adAmounts(p.ads).reduce((a, r) => a + r.perDay, 0);
  const decide = async (decision: "approved" | "changes") => {
    if (decision === "changes" && note.trim().length < 3) { toast("Write what should change.", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/approvals/self", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lid: p.id, decision, note }) });
      const j = (await r.json()) as { launch?: LaunchProduct; receipt?: string; error?: string };
      if (!r.ok || !j.launch) { toast(j.error || "Could not save.", "error"); return; }
      const next = j.launch;
      useStore.setState((s) => ({ launches: s.launches.map((x) => (x.id === next.id ? next : x)) }));
      toast(decision === "approved" ? `Approved. Code ${j.receipt}. The team will publish it.` : "Sent to the team.");
      setNote("");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <PhotoThumb p={p} size={88} />
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-semibold">{p.brand} {p.name}</p>
            <p className="text-[13px] text-muted">{p.size} · price {inr(p.price)} · MRP {inr(p.mrp)} · {p.stock} packs</p>
            <div className="mt-2"><ChannelDots p={p} /></div>
          </div>
          <Badge tone={APPROVAL[p.approval.state].tone}>{APPROVAL[p.approval.state].label}</Badge>
        </div>
      </Card>
      <Card>
        <CardHeader title="Price and what you keep on each app" subtitle="'You keep' is after the app's fees, shipping and GST, minus your cost." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="border-y border-line bg-raised text-[12px] text-muted"><tr>{["App", "Price", "Packs", "You keep per pack", "Status"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {on.map((l) => { const f = profitOn(p, l); const j = p.jobs[l.channel]; return (
                <tr key={l.channel}>
                  <td className="px-4 py-2.5 font-medium"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: CH[l.channel].color }} />{CH[l.channel].label}</td>
                  <td className="tnum px-4 py-2.5">{l.price ? inr(l.price) : "—"}</td>
                  <td className="tnum px-4 py-2.5">{CH[l.channel].kind === "social" || CH[l.channel].kind === "search" ? "—" : l.stock}</td>
                  <td className={`tnum px-4 py-2.5 ${f && f.profit < 0 ? "text-neg" : ""}`}>{f ? inr(f.profit) : "—"}</td>
                  <td className="px-4 py-2.5">{j ? <JobBadge state={j.state} /> : <span className="text-muted">Not sent yet</span>}{j?.url && <a href={j.url} target="_blank" rel="noreferrer" className="ml-2 text-[12px] text-accent">Open</a>}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        {ads > 0 && <p className="px-5 py-3 text-[12.5px] text-muted">Ads planned: {inr(ads)} a day for {p.ads.days} days.</p>}
      </Card>
      <Card>
        <CardHeader title="Your approval" subtitle="Nothing goes live until you approve." />
        <div className="space-y-3 px-5 pb-5">
          {p.approval.decidedAt && <p className="text-[13px] text-muted">Last decision: <b>{APPROVAL[p.approval.state].label}</b> on {fmtDateTime(p.approval.decidedAt)}{p.approval.receipt ? ` · code ${p.approval.receipt}` : ""}{p.approval.note ? ` · "${p.approval.note}"` : ""}</p>}
          <Field label="Anything to change? (only needed if you are asking for changes)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Make the Amazon price Rs 349" /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void decide("approved")}><Check />Approve — go live</Button>
            <Button disabled={busy} onClick={() => void decide("changes")}><Pencil />Ask for changes</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
