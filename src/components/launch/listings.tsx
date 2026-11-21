"use client";
import { RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Switch, Textarea, cn } from "@/components/ui";
import { inr, pct } from "@/lib/format";
import { CH, CHANNELS, KIND_LABEL } from "@/lib/launch/channels";
import { profitOn, writeListings } from "@/lib/launch/engine";
import { patchLaunch, useSetup } from "@/lib/launch/state";
import type { ChannelId, ChannelKind, ChannelListing, LaunchProduct } from "@/lib/launch/types";

const ACCOUNT_LABEL = { not_started: "Account not set up", applied: "Account applied", approved: "Account approved" } as const;

function editListing(p: LaunchProduct, ch: ChannelId, fn: (l: ChannelListing) => ChannelListing) {
  patchLaunch(p.id, (x) => ({ ...x, listings: x.listings.map((l) => (l.channel === ch ? { ...fn(l), edited: true } : l)) }));
}
function toggle(p: LaunchProduct, ch: ChannelId, on: boolean) {
  patchLaunch(p.id, (x) => {
    const next = { ...x, listings: x.listings.map((l) => (l.channel === ch ? { ...l, enabled: on } : l)) };
    return { ...next, listings: writeListings(next) };
  });
}
function reset(p: LaunchProduct, ch: ChannelId) {
  patchLaunch(p.id, (x) => {
    const next = { ...x, listings: x.listings.map((l) => (l.channel === ch ? { ...l, edited: false } : l)) };
    return { ...next, listings: writeListings(next) };
  });
}

function ChannelCard({ p, l }: { p: LaunchProduct; l: ChannelListing }) {
  const info = CH[l.channel];
  const setup = useSetup(p.clientId);
  const acc = setup?.accounts?.[l.channel] ?? "not_started";
  const f = l.enabled ? profitOn(p, l) : null;
  const sellsHere = info.kind === "marketplace" || info.kind === "quick";
  return (
    <div className={cn("rounded-xl border p-4 transition-colors", l.enabled ? "border-line-strong bg-surface" : "border-line bg-raised/50")}>
      <div className="flex flex-wrap items-center gap-2">
        <Switch checked={l.enabled} onCheckedChange={(v) => toggle(p, l.channel, v)} label={`Sell on ${info.label}`} />
        <span className="size-2.5 rounded-full" style={{ background: info.color }} />
        <p className="text-[14px] font-semibold">{info.label}</p>
        <Badge tone={info.delivery === "api" ? "accent" : "warn"}>{info.delivery === "api" ? "Sent directly" : "Upload file"}</Badge>
        {sellsHere && <Badge tone={acc === "approved" ? "pos" : acc === "applied" ? "warn" : "neutral"}>{ACCOUNT_LABEL[acc]}</Badge>}
        {l.edited && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => reset(p, l.channel)}><RotateCcw />Back to auto-written</Button>}
      </div>
      <p className="mt-1.5 text-[12.5px] text-muted">{info.how}</p>
      {l.enabled && (
        <div className="mt-3 grid gap-3">
          <Field label={info.kind === "social" ? "Headline" : `Title (${l.title.length}/${info.titleMax})`} error={l.title.length > info.titleMax ? `Keep it under ${info.titleMax} characters for ${info.label}.` : undefined}>
            <Input value={l.title} onChange={(e) => editListing(p, l.channel, (x) => ({ ...x, title: e.target.value }))} />
          </Field>
          {info.bulletCount > 0 && (
            <Field label={`Key points (${info.bulletCount} max, one per line)`}>
              <Textarea rows={Math.min(info.bulletCount, 5)} value={l.bullets.join("\n")} onChange={(e) => editListing(p, l.channel, (x) => ({ ...x, bullets: e.target.value.split("\n").slice(0, info.bulletCount) }))} />
            </Field>
          )}
          <Field label={info.kind === "social" ? "Caption" : "Description"}>
            <Textarea rows={info.kind === "social" ? 5 : 3} value={l.description} onChange={(e) => editListing(p, l.channel, (x) => ({ ...x, description: e.target.value }))} />
          </Field>
          {sellsHere && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Price on this app (₹)"><Input inputMode="decimal" value={l.price || ""} onChange={(e) => editListing(p, l.channel, (x) => ({ ...x, price: Number(e.target.value) || 0 }))} /></Field>
              <Field label={info.kind === "quick" ? "Packs to send to their warehouse" : "Stock shown (shared shop stock)"}><Input inputMode="numeric" value={l.stock || ""} onChange={(e) => editListing(p, l.channel, (x) => ({ ...x, stock: Math.round(Number(e.target.value) || 0) }))} /></Field>
              <div className={cn("rounded-lg px-3 py-2 text-[12.5px]", !f ? "bg-raised text-muted" : f.profit >= 0 ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg")}>
                {f ? (
                  <>
                    <p className="font-semibold">{f.profit >= 0 ? "Profit" : "Loss"} {inr(Math.abs(f.profit))} per pack{f.margin !== null ? ` (${pct(f.margin, 0)})` : ""}</p>
                    <p className="mt-0.5 opacity-90">Reaches the bank: {inr(f.payout)} · fees {inr(f.totalDeductions)}</p>
                  </>
                ) : <p>Add price and cost to see profit after {info.label}&apos;s fees.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ListingsCard({ p }: { p: LaunchProduct }) {
  const kinds: ChannelKind[] = ["marketplace", "quick", "social", "search"];
  const on = p.listings.filter((l) => l.enabled).length;
  return (
    <Card>
      <CardHeader title="3 · Where to sell — listings written for you" subtitle={`${on} of ${CHANNELS.length} channels on. Each listing follows that app's own length and style. Edit any of them; edited ones stay as you wrote them.`} />
      <div className="space-y-6 px-5 pb-5">
        {kinds.map((k) => (
          <section key={k}>
            <h4 className="mb-2 text-[12px] font-semibold tracking-wide text-faint uppercase">{KIND_LABEL[k]}</h4>
            <div className="grid gap-3 xl:grid-cols-2">
              {CHANNELS.filter((c) => c.kind === k).map((c) => {
                const l = p.listings.find((x) => x.channel === c.id);
                return l ? <ChannelCard key={c.id} p={p} l={l} /> : null;
              })}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
