"use client";
import { RefreshCw } from "lucide-react";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { PhotoThumb } from "@/components/launch/bits";
import { useChannelStatus } from "@/components/launch/publish";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Switch } from "@/components/ui";
import { SITE } from "@/config/site";
import { CHANNELS, KIND_LABEL } from "@/lib/launch/channels";
import { writeListings } from "@/lib/launch/engine";
import { manualToOrders, sampleOrders, unitsSold, type Order } from "@/lib/launch/orders";
import { LIVE } from "@/lib/live/mode";
import { useLiveOrders } from "@/lib/live/orders";
import { SellerKeys } from "@/components/live/seller-keys";
import { publishEverywhere } from "@/lib/launch/publish-client";
import { emptySetup, isLive, patchLaunch, setSellerSetup, useSellers } from "@/lib/launch/state";
import type { AccountState, ChannelKind, LaunchProduct } from "@/lib/launch/types";
import { useStore } from "@/lib/store";

const ACC: { value: AccountState; label: string }[] = [{ value: "not_started", label: "Not set up" }, { value: "applied", label: "Applied" }, { value: "approved", label: "Approved" }];

function StockRow({ p, orders }: { p: LaunchProduct; orders: Order[] }) {
  const status = useChannelStatus(p.clientId);
  const simulate = useStore((s) => s.simulatePublish);
  const sold = unitsSold(LIVE ? orders : [...orders, ...sampleOrders(p)], p.id);
  const [total, setTotal] = React.useState(String(p.stock));
  const on = p.listings.filter((l) => l.enabled && l.stock > 0);
  const syncable = p.listings.filter((l) => l.enabled && (l.channel === "amazon" || l.channel === "flipkart") && isLive(p.jobs[l.channel]?.state)).map((l) => l.channel);
  const save = async () => {
    const n = Math.max(0, Math.round(Number(total) || 0));
    // New split of stock across apps; hand-edited listings keep their text and only get the new stock number.
    patchLaunch(p.id, (x) => {
      const y = { ...x, stock: n };
      const fresh = writeListings({ ...y, listings: y.listings.map((l) => ({ ...l, edited: false })) });
      return { ...y, listings: y.listings.map((l) => { const f = fresh.find((z) => z.channel === l.channel); return !f ? l : l.edited ? { ...l, stock: f.stock } : f; }) };
    });
    if (syncable.length) {
      const fresh = useStore.getState().launches.find((x) => x.id === p.id);
      if (fresh) await publishEverywhere(fresh, { simulate: !!status?.demoMode && simulate, city: "", siteUrl: SITE.url, only: syncable });
      toast(`Stock updated to ${n} and sent to ${syncable.length === 2 ? "Amazon and Flipkart" : syncable[0] === "amazon" ? "Amazon" : "Flipkart"}.`);
    } else toast(`Stock updated to ${n}. Quick-delivery stock changes go out with the next upload sheet.`);
  };
  return (
    <tr>
      <td className="px-4 py-2.5"><span className="flex items-center gap-2"><PhotoThumb p={p} size={30} /><span className="font-medium">{p.name}<span className="block text-[11.5px] font-normal text-faint">{p.size}</span></span></span></td>
      <td className="px-4 py-2.5"><Input aria-label={`Total stock of ${p.name}`} className="w-24" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} /></td>
      <td className="tnum px-4 py-2.5">{sold}</td>
      <td className="px-4 py-2.5"><span className="flex flex-wrap gap-1">{on.map((l) => <Badge key={l.channel}>{CHANNELS.find((c) => c.id === l.channel)?.label}: {l.stock}</Badge>)}</span></td>
      <td className="px-4 py-2.5"><Button size="sm" onClick={() => void save()}><RefreshCw />Update everywhere</Button></td>
    </tr>
  );
}

export default function ChannelsPage() {
  const sellers = useSellers();
  const clientId = useStore((s) => s.clientId);
  const [seller, setSeller] = React.useState(clientId);
  const [tick, setTick] = React.useState(0);
  const status = useChannelStatus(seller, tick);
  const { orders: liveOrders } = useLiveOrders(seller);
  const manualAll = useStore((s) => s.manualOrders);
  const orders = React.useMemo(() => [...liveOrders, ...manualToOrders(manualAll)], [liveOrders, manualAll]);
  const setup = useStore((s) => s.sellerSetup[seller]) ?? emptySetup();
  const launches = useStore((s) => s.launches).filter((l) => l.clientId === seller);
  const up = <K extends keyof typeof setup>(k: K, v: (typeof setup)[K]) => setSellerSetup(seller, (s) => ({ ...s, [k]: v }));
  const kinds: ChannelKind[] = ["marketplace", "quick", "social", "search"];
  return (
    <>
      <PageHeader title="Channels & stock" description="Which apps are connected, what each seller has in place before selling, and one stock count that updates every app." actions={
        <Select aria-label="Seller" className="w-52" value={seller} onChange={(e) => setSeller(e.target.value)}>{sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      } />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Connections" subtitle={LIVE ? "Each seller connects their own accounts — add their keys below. Upload-file channels need no keys." : "Direct channels switch on when their keys are added on the server (Vercel → Settings → Environment Variables). Upload-file channels need no keys."} />
          <div className="space-y-4 px-5 pb-5">
            {kinds.map((k) => (
              <div key={k}>
                <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-faint uppercase">{KIND_LABEL[k]}</p>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {CHANNELS.filter((c) => c.kind === k).map((c) => {
                    const env = status?.channels[c.id];
                    return (
                      <li key={c.id} className="px-3 py-2.5 text-[13px]">
                        <p className="flex flex-wrap items-center gap-2 font-semibold"><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.label}
                          {c.delivery === "sheet" ? <Badge tone="warn">Upload file — no keys needed</Badge> : env?.configured ? <Badge tone="pos">Connected</Badge> : <Badge>Keys not added</Badge>}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-muted">{c.needs}</p>
                        {c.delivery === "api" && env && !env.configured && <p className="mt-0.5 text-[11.5px] text-faint">Add: {env.missing.join(", ")}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="text-[12px] text-faint">Telegram alerts: {status?.channels.telegram?.configured ? "connected" : "add TELEGRAM_BOT_TOKEN"} · Signed approval links: {status?.signedApprovals ? "on" : "add APPROVAL_SECRET"}</p>
          </div>
        </Card>
        <Card>
          <CardHeader title={`What ${sellers.find((c) => c.id === seller)?.name ?? "the seller"} needs once`} subtitle="Filled once per seller. One-Click Launch checks these before anything goes live." />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="WhatsApp number (with 91)"><Input inputMode="tel" value={setup.phone} onChange={(e) => up("phone", e.target.value.replace(/[^\d]/g, ""))} /></Field>
            <Field label="Telegram chat ID" hint="For the seller's own alerts. See Alerts & offers."><Input value={setup.telegramChatId} onChange={(e) => up("telegramChatId", e.target.value.trim())} /></Field>
            <Field label="FSSAI licence number"><Input inputMode="numeric" value={setup.fssaiNumber} onChange={(e) => up("fssaiNumber", e.target.value.replace(/[^\d]/g, "").slice(0, 14))} /></Field>
            <Field label="FSSAI valid until"><Input type="date" value={setup.fssaiExpiry} onChange={(e) => up("fssaiExpiry", e.target.value)} /></Field>
            <Field label="GSTIN"><Input value={setup.gstin} onChange={(e) => up("gstin", e.target.value.toUpperCase().slice(0, 15))} /></Field>
            <Field label="PAN"><Input value={setup.pan} onChange={(e) => up("pan", e.target.value.toUpperCase().slice(0, 10))} /></Field>
            <Field label="Pickup pincode"><Input inputMode="numeric" value={setup.pickupPincode} onChange={(e) => up("pickupPincode", e.target.value.replace(/[^\d]/g, "").slice(0, 6))} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-[13px]"><Switch checked={setup.bankVerified} onCheckedChange={(v) => up("bankVerified", v)} label="Bank account verified" />Bank account verified</label>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[12px] font-medium text-muted">Seller accounts on each app</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHANNELS.filter((c) => c.kind === "marketplace" || c.kind === "quick").map((c) => (
                  <label key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-[13px]">
                    <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.label}</span>
                    <Select aria-label={`${c.label} account`} className="h-7 w-32 text-[12.5px]" value={setup.accounts[c.id] ?? "not_started"} onChange={(e) => up("accounts", { ...setup.accounts, [c.id]: e.target.value as AccountState })}>{ACC.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</Select>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
      {LIVE && seller && <SellerKeys clientId={seller} sellerName={sellers.find((c) => c.id === seller)?.name ?? "this seller"} onSaved={() => setTick((t) => t + 1)} />}
      <Card className="mt-4">
        <CardHeader title="One stock count for every app" subtitle="Change the total once. Amazon and Flipkart are updated straight away (when connected); quick-delivery apps get their share in the next upload sheet." />
        {launches.length === 0 ? <p className="px-5 pb-5 text-[13px] text-muted">No products for this seller yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-y border-line bg-raised text-[12px] text-muted"><tr>{["Product", "Total stock", "Sold", "On each app", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{launches.map((p) => <StockRow key={p.id} p={p} orders={orders} />)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
