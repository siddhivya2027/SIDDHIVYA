"use client";
import { Clapperboard, Download, ImageIcon, Megaphone } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "@/components/shared";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import type { AdPlatform, Campaign } from "@/lib/demo/types";
import { inr } from "@/lib/format";
import { adAmounts, marketplaceNames } from "@/lib/launch/engine";
import { download } from "@/lib/launch/files";
import { drawBanner } from "@/lib/launch/media";
import { patchLaunch } from "@/lib/launch/state";
import type { AdPlan, LaunchProduct } from "@/lib/launch/types";
import { newId, useStore } from "@/lib/store";

export function CreativeCard({ p }: { p: LaunchProduct }) {
  const [busy, setBusy] = React.useState(false);
  const make = async () => {
    if (!p.photos.length) { toast("Add a photo first.", "error"); return; }
    setBusy(true);
    try {
      const banner = await drawBanner(p, marketplaceNames(p));
      patchLaunch(p.id, (x) => ({ ...x, banner }));
    } catch { toast("Could not draw the post image.", "error"); } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader title="4 · Post image and reel" subtitle="The square image goes to Facebook, Instagram and WhatsApp. Redraw it after changing the price or photos." action={
        <>
          <Link href={`/studio/reel?launch=${p.id}`} className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-raised"><Clapperboard className="size-4" />Make a reel</Link>
          <Button variant="primary" onClick={make} disabled={busy}><ImageIcon />{busy ? "Drawing…" : p.banner ? "Redraw post image" : "Make post image"}</Button>
        </>
      } />
      <div className="flex flex-wrap items-start gap-5 px-5 pb-5">
        {p.banner ? (
          <>
            <img src={p.banner} alt="Post image" className="w-full max-w-[320px] rounded-lg border border-line" />
            <Button onClick={() => download(dataUrlBlob(p.banner!), `${p.sku || "post"}-1080.jpg`, "image/jpeg")}><Download />Download</Button>
          </>
        ) : <p className="text-[13px] text-muted">No post image yet. Press &quot;Make post image&quot; — it uses the main photo, name, pack size, price and the apps you sell on.</p>}
      </div>
    </Card>
  );
}

function dataUrlBlob(d: string): Blob {
  const [m, b] = d.split(",");
  const bin = atob(b);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: m.slice(5, m.indexOf(";")) });
}

export function AdsCard({ p }: { p: LaunchProduct }) {
  const saveCampaign = useStore((s) => s.saveCampaign);
  const set = (fn: (a: AdPlan) => AdPlan) => patchLaunch(p.id, (x) => ({ ...x, ads: fn(x.ads) }));
  const rows = adAmounts(p.ads);
  const total = p.ads.dailyBudget * p.ads.days;
  const create = () => {
    const platforms: AdPlatform[] = ["meta", "amazon_ads", "flipkart_ads"];
    let n = 0;
    for (const k of platforms) {
      const perDay = rows.find((r) => r.key === k)?.perDay ?? 0;
      if (perDay <= 0) continue;
      const c: Campaign = {
        id: newId(), clientId: p.clientId, platform: k, name: `${p.brand} ${p.name} — launch`, objective: "Sales", status: "draft",
        dailyBudget: perDay, destination: k === "flipkart_ads" ? "flipkart" : "amazon", startDate: todayISO(),
        adsets: [{ id: newId(), name: "Launch buyers", audience: "Interested in sweets, gifting and festivals · 22–55 · India", ads: [{ id: newId(), name: `${p.name} post`, format: k === "meta" ? "Single image" : "Sponsored product" }] }],
        productIds: [], custom: true,
      };
      saveCampaign(c, true); n++;
    }
    patchLaunch(p.id, (x) => ({ ...x, ads: { ...x.ads, created: true } }));
    toast(`${n} draft campaign${n === 1 ? "" : "s"} created. Review and start them in Meta Ads and Advertising.`);
  };
  return (
    <Card>
      <CardHeader title="5 · Ads plan" subtitle="A daily budget split across Meta and the marketplaces. Campaigns are created as drafts — nothing spends until the team starts them." action={<Button variant="primary" onClick={create}><Megaphone />{p.ads.created ? "Create again" : "Create draft campaigns"}</Button>} />
      <div className="grid gap-4 px-5 pb-5 md:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <Field label="Daily ad budget (₹)"><Input inputMode="numeric" value={p.ads.dailyBudget || ""} onChange={(e) => set((a) => ({ ...a, dailyBudget: Math.round(Number(e.target.value) || 0) }))} /></Field>
          <Field label="For how many days"><Input inputMode="numeric" value={p.ads.days || ""} onChange={(e) => set((a) => ({ ...a, days: Math.round(Number(e.target.value) || 0) }))} /></Field>
          <p className="text-[12.5px] text-muted">Total: <b className="text-ink">{inr(total)}</b>. Ad money is paid by the seller directly to Meta, Amazon and Flipkart.</p>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
              <p className="min-w-0 flex-1 text-[13px] font-medium">{r.label}</p>
              <Input aria-label={`${r.label} share in percent`} className="w-20" inputMode="numeric" value={Math.round((p.ads.split[r.key] ?? 0) * 100)} onChange={(e) => set((a) => ({ ...a, split: { ...a.split, [r.key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 } }))} />
              <span className="text-[12px] text-faint">%</span>
              <span className="tnum w-24 text-right text-[13px] font-semibold">{inr(r.perDay)}/day</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
