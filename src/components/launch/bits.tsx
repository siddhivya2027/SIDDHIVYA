"use client";
import { Check, CircleAlert, CircleDashed, CloudUpload, FlaskConical, Loader2, PlugZap, Upload } from "lucide-react";
import { Badge, cn, type Tone } from "@/components/ui";
import { CH } from "@/lib/launch/channels";
import type { ApprovalState, ChannelId, JobState, LaunchProduct } from "@/lib/launch/types";

export const JOB: Record<JobState, { label: string; tone: Tone; icon: React.ReactNode }> = {
  idle: { label: "Not sent", tone: "neutral", icon: <CircleDashed /> },
  sending: { label: "Sending", tone: "accent", icon: <Loader2 className="animate-spin" /> },
  live: { label: "Live", tone: "pos", icon: <Check /> },
  demo_live: { label: "Demo live", tone: "ai", icon: <FlaskConical /> },
  needs_upload: { label: "Upload file ready", tone: "warn", icon: <Upload /> },
  uploaded: { label: "Uploaded", tone: "pos", icon: <CloudUpload /> },
  needs_connection: { label: "Not connected", tone: "warn", icon: <PlugZap /> },
  failed: { label: "Failed", tone: "neg", icon: <CircleAlert /> },
};
export function JobBadge({ state }: { state: JobState }) {
  const j = JOB[state];
  return <Badge tone={j.tone}>{j.icon}{j.label}</Badge>;
}
export const APPROVAL: Record<ApprovalState, { label: string; tone: Tone }> = {
  not_sent: { label: "Not sent to seller", tone: "neutral" },
  sent: { label: "Waiting for seller", tone: "warn" },
  approved: { label: "Approved by seller", tone: "pos" },
  changes: { label: "Seller asked for changes", tone: "neg" },
};

/** A row of small coloured dots, one per channel switched on, filled when live. */
export function ChannelDots({ p }: { p: LaunchProduct }) {
  return (
    <span className="flex flex-wrap gap-1">
      {p.listings.filter((l) => l.enabled).map((l) => {
        const st = p.jobs[l.channel]?.state ?? "idle";
        const on = st === "live" || st === "demo_live" || st === "uploaded";
        return (
          <span key={l.channel} title={`${CH[l.channel].label}: ${JOB[st].label}`} className={cn("inline-flex h-5 items-center rounded-full border px-1.5 text-[10.5px] font-semibold", on ? "border-transparent text-white" : "border-line text-faint")} style={on ? { background: CH[l.channel].color } : undefined}>
            {CH[l.channel].label.split(" ")[0]}
          </span>
        );
      })}
    </span>
  );
}

export function ChannelChip({ id, className }: { id: ChannelId; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", className)}><span className="size-2.5 rounded-full" style={{ background: CH[id].color }} />{CH[id].label}</span>;
}

export function PhotoThumb({ p, size = 40 }: { p: LaunchProduct; size?: number }) {
  const src = p.photos[0]?.src;
  return src
    ? <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-md object-cover" style={{ width: size, height: size }} />
    : <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-md bg-accent-soft font-semibold text-accent" style={{ width: size, height: size, fontSize: size * 0.36 }}>{(p.name || "?").slice(0, 2).toUpperCase()}</span>;
}
