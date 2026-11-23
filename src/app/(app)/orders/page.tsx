"use client";
import { BellRing, FileUp, Hand, RefreshCw, Trash2, Wallet } from "lucide-react";
import * as React from "react";
import { MetricCard, PageHeader, toast } from "@/components/shared";
import { PhotoThumb } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { inr } from "@/lib/format";
import { CH, CHANNELS } from "@/lib/launch/channels";
import { importSettlements, manualToOrders, sampleOrders, unitsSold, type Order } from "@/lib/launch/orders";
import { profitOn } from "@/lib/launch/engine";
import { notifyTelegram } from "@/lib/launch/publish-client";
import { addManualOrder, deleteManualOrder, useSellers } from "@/lib/launch/state";
import { newId } from "@/lib/store";
import type { ChannelId } from "@/lib/launch/types";
import { useStore } from "@/lib/store";
import { LIVE } from "@/lib/live/mode";
import { useLiveOrders } from "@/lib/live/orders";
import { isSellerLogin } from "@/lib/live/auth-client";

export default function OrdersPage() {
  const launches = useStore((s) => s.launches);
  const settlements = useStore((s) => s.settlements);
  const setup = useStore((s) => s.sellerSetup);
  const rules = useStore((s) => s.alertRules);
  const sellers = useSellers();
  const session = useStore((s) => s.session);
  const sellerLogin = LIVE && isSellerLogin(session);
  const [seller, setSeller] = React.useState(sellerLogin && session?.clientId ? session.clientId : "all");
  const live = useLiveOrders(seller === "all" ? undefined : seller);
  const [syncing, setSyncing] = React.useState(false);
  const syncNow = async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/v1/orders/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(seller === "all" ? {} : { clientId: seller }) });
      const j = (await r.json()) as { result?: Record<string, string>; error?: string };
      if (!r.ok) toast(j.error || "Could not fetch orders.", "error"); else { toast(Object.values(j.result ?? {})[0] ?? "Done."); live.reload(); }
    } finally { setSyncing(false); }
  };
  const [importCh, setImportCh] = React.useState<ChannelId>("amazon");
  const file = React.useRef<HTMLInputElement>(null);
  const mine = launches.filter((l) => seller === "all" || l.clientId === seller);
  const manualAll = useStore((s) => s.manualOrders);
  const manual = React.useMemo(() => manualToOrders(manualAll.filter((m) => seller === "all" || m.clientId === seller)), [manualAll, seller]);
  const orders: Order[] = React.useMemo(() => [...manual, ...(LIVE ? live.orders : mine.flatMap((p) => sampleOrders(p)))].sort((a, b) => b.ts - a.ts), [mine, live.orders, manual]);
  const [handOpen, setHandOpen] = React.useState(false);
  const imported = settlements.filter((s) => seller === "all" || s.clientId === seller);
  const now = Date.now();
  const sales = orders.reduce((a, o) => a + o.sale, 0) + imported.reduce((a, o) => a + o.sale, 0);
  const fees = orders.reduce((a, o) => a + o.fees, 0) + imported.reduce((a, o) => a + o.fees, 0);
  const paid = orders.filter((o) => o.payoutOn <= now).reduce((a, o) => a + o.payout, 0) + imported.reduce((a, o) => a + o.payout, 0);
  const pending = orders.filter((o) => o.payoutOn > now).reduce((a, o) => a + o.payout, 0);
  const sellerName = (id: string) => sellers.find((c) => c.id === id)?.name ?? id;

  const byChannel = CHANNELS.filter((c) => c.kind === "marketplace" || c.kind === "quick").map((c) => {
    const o = orders.filter((x) => x.channel === c.id), im = imported.filter((x) => x.channel === c.id);
    return { c, count: o.length + im.length, sale: o.reduce((a, x) => a + x.sale, 0) + im.reduce((a, x) => a + x.sale, 0), payout: o.reduce((a, x) => a + x.payout, 0) + im.reduce((a, x) => a + x.payout, 0) };
  }).filter((r) => r.count > 0);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const clientId = seller === "all" ? (launches[0]?.clientId ?? "aarvi") : seller;
    const res = importSettlements(await f.text(), clientId, importCh);
    if (res.error) { toast(res.error, "error"); return; }
    useStore.setState((s) => ({ settlements: [...res.rows, ...s.settlements.filter((x) => !res.rows.some((r) => r.id === x.id))].slice(0, 5000) }));
    toast(`Imported ${res.rows.length} settlement rows${res.skipped ? `, skipped ${res.skipped}` : ""}.`);
  };

  const lowStock = mine.map((p) => ({ p, left: p.stock - unitsSold(orders, p.id) })).filter((x) => x.p.liveSince && x.left <= rules.lowStockUnits);
  const alert = async (name: string, left: number, clientId: string) => {
    const st = await notifyTelegram(`⚠️ Low stock: only ${Math.max(0, left)} packs of ${name} left. Restock soon.`, setup[clientId]?.telegramChatId);
    toast(st === "sent" ? "Alert sent on Telegram." : st === "pending_configuration" ? "Telegram is not set up yet (see Alerts & offers)." : "Telegram alert failed.", st === "sent" ? "ok" : "error");
  };

  return (
    <>
      <PageHeader title="Orders & money" description={LIVE ? "Real orders. Amazon orders arrive by themselves every morning (or press Fetch). For Flipkart, Meesho and the quick-delivery apps, import their settlement file. Fees shown for Amazon orders are worked out from Amazon's fee rules until the settlement file confirms them." : "Orders from every app, the fees each app keeps, and when the money reaches the seller's bank. Sample orders appear for products sent live in demo mode; import each app's settlement file for real figures."} actions={
        <>
          {!sellerLogin && <Select aria-label="Seller" value={seller} onChange={(e) => setSeller(e.target.value)} className="w-48"><option value="all">All sellers</option>{sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
          {!sellerLogin && <Button onClick={() => setHandOpen(true)}><Hand />Add order by hand</Button>}
          {LIVE && !sellerLogin && <Button onClick={() => void syncNow()} disabled={syncing}><RefreshCw />{syncing ? "Fetching…" : "Fetch Amazon orders now"}</Button>}
        </>
      } />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Orders" value={String(orders.length + imported.length)} />
        <MetricCard label="Sales" value={inr(sales, true)} />
        <MetricCard label="Kept by apps (fees)" value={inr(fees, true)} />
        <MetricCard label="Paid to bank" value={inr(paid, true)} />
        <MetricCard label="On the way to bank" value={inr(pending, true)} />
      </div>
      {lowStock.length > 0 && (
        <Card className="mb-4 border-warn">
          <CardHeader title="Running low" subtitle={`Products at or under ${rules.lowStockUnits} packs (change this in Alerts & offers).`} />
          <ul className="divide-y divide-line px-5 pb-3">
            {lowStock.map(({ p, left }) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-[13px]"><PhotoThumb p={p} size={32} /><span className="flex-1"><b>{p.name}</b> · {sellerName(p.clientId)} — {Math.max(0, left)} packs left</span>{!sellerLogin && <Button size="sm" onClick={() => alert(p.name, left, p.clientId)}><BellRing />Alert on Telegram</Button>}</li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Recent orders" subtitle={!LIVE && orders.length ? "Sample orders (demo) — they stop when real order feeds are connected." : undefined} />
          {orders.length + imported.length === 0 ? <EmptyState icon={<Wallet />} title="No orders yet" body="Send a product live from One-Click Launch, or import a settlement file." /> : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="sticky top-0 border-y border-line bg-raised text-[12px] text-muted"><tr>{["When", "App", "Order", "Qty", "Sale", "Fees", "To bank", "Paid on"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {imported.slice(0, 100).map((o) => <tr key={o.id}><td className="px-3 py-2 text-muted">{o.date}</td><td className="px-3 py-2">{CH[o.channel].label}</td><td className="px-3 py-2">{o.orderId} <Badge tone="pos">Imported</Badge></td><td className="px-3 py-2">—</td><td className="tnum px-3 py-2">{inr(o.sale)}</td><td className="tnum px-3 py-2">{inr(o.fees)}</td><td className="tnum px-3 py-2">{inr(o.payout)}</td><td className="px-3 py-2">{o.date}</td></tr>)}
                  {orders.slice(0, 200).map((o) => <tr key={o.id}><td className="px-3 py-2 whitespace-nowrap text-muted">{fmtDateTime(o.ts)}</td><td className="px-3 py-2">{CH[o.channel].label}</td><td className="px-3 py-2">{o.orderId ?? o.id} {o.sample ? <Badge tone="ai">Sample</Badge> : <Badge tone={o.status === "By hand" ? "ai" : "pos"}>{o.status ?? "Real"}</Badge>}{o.status === "By hand" && !sellerLogin && <button type="button" aria-label="Delete hand order" className="ml-1 align-middle text-faint hover:text-neg" onClick={() => { if (window.confirm("Delete this hand-entered order?")) deleteManualOrder(o.id); }}><Trash2 className="inline size-3.5" /></button>}</td><td className="tnum px-3 py-2">{o.qty}</td><td className="tnum px-3 py-2">{inr(o.sale)}</td><td className="tnum px-3 py-2">{inr(o.fees)}</td><td className="tnum px-3 py-2">{inr(o.payout)}</td><td className="px-3 py-2 whitespace-nowrap">{o.payoutOn <= now ? "Paid" : new Date(o.payoutOn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="By app" />
            <ul className="divide-y divide-line px-5 pb-3">
              {byChannel.length === 0 && <li className="py-3 text-[13px] text-muted">Nothing yet.</li>}
              {byChannel.map((r) => <li key={r.c.id} className="flex items-center gap-2 py-2 text-[13px]"><span className="size-2.5 rounded-full" style={{ background: r.c.color }} /><span className="flex-1 font-medium">{r.c.label}</span><span className="tnum text-muted">{r.count} orders</span><span className="tnum w-24 text-right font-semibold">{inr(r.payout, true)}</span></li>)}
            </ul>
          </Card>
          {!sellerLogin && <Card>
            <CardHeader title="Import a settlement file" subtitle="Download the payments / settlement report from the app's seller dashboard (CSV) and add it here for real figures." />
            <div className="space-y-3 px-5 pb-5">
              <Field label="From which app"><Select value={importCh} onChange={(e) => setImportCh(e.target.value as ChannelId)}>{CHANNELS.filter((c) => c.kind === "marketplace" || c.kind === "quick").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
              {seller === "all" && <p className="text-[12px] text-warn">Choose a seller at the top first, so the figures go to the right seller.</p>}
              <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
              <Button variant="primary" disabled={seller === "all"} onClick={() => file.current?.click()}><FileUp />Choose CSV file</Button>
              <p className="text-[12px] text-faint">Reads the date, order ID, sale, fees and payout columns, whatever each app calls them. {LIVE ? "Imported rows are saved for the whole team." : "Imported rows stay in this browser."}</p>
            </div>
          </Card>}
        </div>
      </div>
      <HandOrder open={handOpen} onClose={() => setHandOpen(false)} defaultSeller={seller === "all" ? "" : seller} />
    </>
  );
}

/** Type in an order that came by phone, WhatsApp or the shop counter — or one from an app whose order feed isn't connected. */
function HandOrder({ open, onClose, defaultSeller }: { open: boolean; onClose: () => void; defaultSeller: string }) {
  const sellers = useSellers();
  const launches = useStore((s) => s.launches);
  const by = useStore((s) => s.session?.name ?? "Team");
  const [cid, setCid] = React.useState(defaultSeller);
  const [lid, setLid] = React.useState("");
  const [ch, setCh] = React.useState<ChannelId>("whatsapp");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = React.useState("1");
  const [sale, setSale] = React.useState("");
  const [fees, setFees] = React.useState("");
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (open) { setCid(defaultSeller); setLid(""); setSale(""); setFees(""); setNote(""); setQty("1"); } }, [open, defaultSeller]);
  const prods = launches.filter((l) => l.clientId === cid);
  const p = prods.find((x) => x.id === lid);
  const q = Math.max(1, Math.round(Number(qty) || 1));
  const l = p?.listings.find((x) => x.channel === ch);
  const autoSale = p ? (l?.price || p.price) * q : 0;
  const f = p && l && CH[ch].kind !== "social" ? profitOn(p, l) : null;
  const autoFees = f && l?.price ? Math.round(((l.price - f.payout) / l.price) * autoSale) : 0;
  const save = () => {
    if (!cid || !p) { toast("Choose the seller and the product.", "error"); return; }
    const s = sale ? Number(sale) : autoSale;
    if (!(s > 0)) { toast("Enter the sale amount.", "error"); return; }
    const ts = new Date(`${date}T12:00:00`).getTime();
    if (!Number.isFinite(ts) || ts > Date.now() + 86400000) { toast("Check the date.", "error"); return; }
    addManualOrder({ id: `H-${newId().slice(0, 8).toUpperCase()}`, clientId: cid, launchId: p.id, channel: ch, ts, qty: q, sale: s, fees: fees ? Number(fees) : autoFees, note: note.trim(), by });
    toast("Order added. Stock and reports count it."); onClose();
  };
  const choices = CHANNELS.filter((c) => c.kind === "marketplace" || c.kind === "quick" || c.kind === "social");
  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }} title="Add an order by hand" description="Phone, WhatsApp or shop-counter orders — or app orders when the automatic feed isn't working. Stock, money and the daily report include these." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}><Hand />Add order</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Seller"><Select value={cid} onChange={(e) => { setCid(e.target.value); setLid(""); }}><option value="">Choose…</option>{sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Product"><Select value={lid} onChange={(e) => setLid(e.target.value)}><option value="">Choose…</option>{prods.map((x) => <option key={x.id} value={x.id}>{x.name} {x.size}</option>)}</Select></Field>
        <Field label="Where the order came from"><Select value={ch} onChange={(e) => setCh(e.target.value as ChannelId)}>{choices.map((c) => <option key={c.id} value={c.id}>{c.kind === "social" ? `${c.label} / phone / shop (direct)` : c.label}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Packs"><Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Sale amount (Rs)" hint={autoSale ? `Leave empty for Rs ${autoSale}` : undefined}><Input inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
        <Field label="Fees the app keeps (Rs)" hint={CH[ch].kind === "social" ? "Direct sale: usually 0" : autoFees ? `Leave empty for about Rs ${autoFees}` : undefined}><Input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
        <Field label="Note (customer, order ID…)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
