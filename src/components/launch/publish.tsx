"use client";
import { CircleAlert, CircleCheck, ExternalLink, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import * as React from "react";
import { JobBadge } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, Switch, cn } from "@/components/ui";
import { SITE } from "@/config/site";
import { fmtDateTime } from "@/lib/dates";
import { CH } from "@/lib/launch/channels";
import { blocking, readiness } from "@/lib/launch/engine";
import { fetchChannelStatus, publishEverywhere, type ChannelStatus } from "@/lib/launch/publish-client";
import { setJob, useSellers, useSetup } from "@/lib/launch/state";
import type { ChannelId, LaunchProduct } from "@/lib/launch/types";
import { useStore } from "@/lib/store";

export function useChannelStatus(clientId?: string, tick = 0) {
  const [st, setSt] = React.useState<ChannelStatus | null>(null);
  React.useEffect(() => { void fetchChannelStatus(clientId).then(setSt); }, [clientId, tick]);
  return st;
}

export function ChecksList({ p }: { p: LaunchProduct }) {
  const setup = useSetup(p.clientId);
  const checks = readiness(p, setup);
  return (
    <ul className="space-y-1.5">
      {checks.map((c, i) => (
        <li key={i} className={cn("flex gap-2 text-[12.5px]", c.level === "block" ? "text-neg" : c.level === "warn" ? "text-warn" : "text-pos")}>
          {c.level === "block" ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : c.level === "warn" ? <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> : <CircleCheck className="mt-0.5 size-3.5 shrink-0" />}
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function OneClickButton({ p, className }: { p: LaunchProduct; className?: string }) {
  const setup = useSetup(p.clientId);
  const sellers = useSellers();
  const simulate = useStore((s) => s.simulatePublish);
  const status = useChannelStatus(p.clientId);
  const [running, setRunning] = React.useState(false);
  const blocks = blocking(readiness(p, setup));
  const approved = p.approval.state === "approved";
  const on = p.listings.filter((l) => l.enabled).length;
  const city = sellers.find((c) => c.id === p.clientId)?.city ?? "";
  const go = async () => {
    setRunning(true);
    try { await publishEverywhere(p, { simulate: !!status?.demoMode && simulate, city, siteUrl: SITE.url }); } finally { setRunning(false); }
  };
  const why = blocks.length ? `Fix ${blocks.length} thing${blocks.length > 1 ? "s" : ""} first` : !approved ? "Waiting for the seller's approval" : "";
  return (
    <div className={className}>
      <button type="button" onClick={go} disabled={!!why || running}
        className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#e0781e] via-accent to-[#c2337a] px-5 py-4 text-left text-white shadow-card transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-50">
        <span className="block text-[20px] font-extrabold tracking-tight">{running ? "Sending…" : "ONE CLICK"}</span>
        <span className="block text-[13px] opacity-95">{running ? "Each channel's answer appears below" : `Publish ${p.name || "this product"} to ${on} channel${on === 1 ? "" : "s"}`}</span>
      </button>
      {why && <p className="mt-1.5 text-center text-[12px] text-muted">{why}</p>}
    </div>
  );
}

export function PublishCard({ p }: { p: LaunchProduct }) {
  const status = useChannelStatus(p.clientId);
  const simulate = useStore((s) => s.simulatePublish);
  const sellers = useSellers();
  const city = sellers.find((c) => c.id === p.clientId)?.city ?? "";
  const on = p.listings.filter((l) => l.enabled);
  const retry = (ch: ChannelId) => publishEverywhere(p, { simulate: !!status?.demoMode && simulate, city, siteUrl: SITE.url, only: [ch] });
  const mark = (ch: ChannelId, state: "uploaded" | "live") => setJob(p.id, { channel: ch, state, message: state === "uploaded" ? "Uploaded in the portal by the team — waiting for the app's own approval." : "Confirmed live by the team.", ts: Date.now() });
  return (
    <Card>
      <CardHeader title="8 · ONE CLICK — publish everywhere" subtitle="Direct channels are sent through their APIs. Meesho, Blinkit, Zepto, Instamart and Google get a ready upload file. Every answer is recorded here." action={
        status?.demoMode ? <label className="flex items-center gap-2 text-[12.5px] text-muted"><Switch checked={simulate} onCheckedChange={(v) => useStore.setState({ simulatePublish: v })} label="Show unconnected channels as demo" />Demo: show unconnected channels as &quot;Demo live&quot;</label> : null
      } />
      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <OneClickButton p={p} />
          <div><p className="mb-2 text-[12px] font-semibold text-faint uppercase">Before selling</p><ChecksList p={p} /></div>
        </div>
        <div className="divide-y divide-line rounded-xl border border-line">
          {on.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-muted">No channels switched on.</p>}
          {on.map((l) => {
            const info = CH[l.channel];
            const j = p.jobs[l.channel];
            const env = status?.channels[l.channel];
            return (
              <div key={l.channel} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: info.color }} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">{info.label}
                    {info.delivery === "api" ? <Badge tone={env?.configured ? "pos" : "neutral"}>{env ? (env.configured ? "Connected" : "Keys not added") : "Direct"}</Badge> : <Badge tone="warn">Upload file</Badge>}
                    {j && <JobBadge state={j.state} />}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{j ? j.message : info.how}</p>
                  {j && <p className="mt-0.5 text-[11.5px] text-faint">{fmtDateTime(j.ts)}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {j?.url && <a href={j.url} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-raised"><ExternalLink className="size-3.5" />Open</a>}
                  {j?.state === "needs_upload" && <Button size="sm" onClick={() => mark(l.channel, "uploaded")}><Upload />Mark uploaded</Button>}
                  {j?.state === "uploaded" && <Button size="sm" onClick={() => mark(l.channel, "live")}>Mark live</Button>}
                  {j && j.state !== "sending" && <Button size="sm" variant="ghost" onClick={() => void retry(l.channel)}><RotateCcw />{j.state === "needs_upload" || j.state === "uploaded" ? "Download again" : "Send again"}</Button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
