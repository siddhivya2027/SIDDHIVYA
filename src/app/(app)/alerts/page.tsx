"use client";
import { BellRing, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { useChannelStatus } from "@/components/launch/publish";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { captionFor, marketplaceNames } from "@/lib/launch/engine";
import { notifyTelegram } from "@/lib/launch/publish-client";
import { dailyReportText, sendDailyReports } from "@/lib/launch/reports";
import { useSellers } from "@/lib/launch/state";
import { newId, useStore } from "@/lib/store";

export default function AlertsPage() {
  const status = useChannelStatus();
  const rules = useStore((s) => s.alertRules);
  const log = useStore((s) => s.alertLog);
  const optIns = useStore((s) => s.optIns);
  const launches = useStore((s) => s.launches);
  const setup = useStore((s) => s.sellerSetup);
  const sellers = useSellers();
  const clientId = useStore((s) => s.clientId);
  const [seller, setSeller] = React.useState(clientId);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [lid, setLid] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const setRules = (p: Partial<typeof rules>) => useStore.setState((s) => ({ alertRules: { ...s.alertRules, ...p } }));
  const tgOn = !!status?.channels.telegram?.configured;
  const waOn = !!status?.channels.whatsapp?.configured;
  const buyers = optIns.filter((o) => o.clientId === seller);
  const products = launches.filter((l) => l.clientId === seller);
  const product = products.find((p) => p.id === lid) ?? products[0];
  const offer = product ? (product.listings.find((l) => l.channel === "whatsapp")?.description || captionFor(product, "whatsapp", marketplaceNames(product))) : "";
  const sellerName = sellers.find((c) => c.id === seller)?.name ?? "";

  const test = async () => {
    const st = await notifyTelegram(`✅ Test from SIDDHIVYA — alerts for ${sellerName} are working.`, setup[seller]?.telegramChatId);
    toast(st === "sent" ? "Test sent." : st === "pending_configuration" ? "Telegram is not set up yet — add TELEGRAM_BOT_TOKEN and a chat ID." : "Telegram could not send. Check the chat ID.", st === "sent" ? "ok" : "error");
  };
  const addBuyer = () => {
    const ph = phone.replace(/[^\d]/g, "");
    if (ph.length < 10) { toast("Enter the number with country code, e.g. 919876543210.", "error"); return; }
    useStore.setState((s) => ({ optIns: [{ id: newId(), clientId: seller, name: name.trim(), phone: ph.length === 10 ? `91${ph}` : ph, addedAt: Date.now() }, ...s.optIns.filter((o) => !(o.clientId === seller && o.phone.endsWith(ph.slice(-10))))] }));
    setName(""); setPhone("");
  };
  const sendApi = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const l = product.listings.find((x) => x.channel === "whatsapp");
      const res = await fetch("/api/v1/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        channel: "whatsapp", listing: { title: l?.title || product.name, bullets: [], description: offer, price: product.price || 1, stock: product.stock },
        product: { name: product.name, brand: product.brand, sku: product.sku, size: product.size, mrp: product.mrp, weightGrams: product.weightGrams, amazonProductType: "", flipkartFsn: "" },
        recipients: buyers.map((b) => ({ name: b.name, phone: b.phone })),
      }) });
      const j = (await res.json()) as { state: string; message: string };
      toast(j.message, j.state === "live" ? "ok" : "error");
    } catch { toast("Could not reach the server.", "error"); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Alerts & offers" description="Telegram alerts and the daily report for the team and each seller, and WhatsApp offers to buyers who said yes." actions={
        <Select aria-label="Seller" className="w-52" value={seller} onChange={(e) => { setSeller(e.target.value); setLid(""); }}>{sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      } />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Telegram alerts" subtitle={tgOn ? "Connected." : "Not connected yet."} action={<Badge tone={tgOn ? "pos" : "warn"}>{tgOn ? "Connected" : "Add TELEGRAM_BOT_TOKEN"}</Badge>} />
          <div className="space-y-4 px-5 pb-5 text-[13px]">
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code>, and copy the token into <code>TELEGRAM_BOT_TOKEN</code> on Vercel.</li>
              <li>Each person (seller or team) opens the bot and presses <b>Start</b>.</li>
              <li>Get their chat ID (for example by messaging <b>@userinfobot</b>) and save it on Channels &amp; stock. The team&apos;s own chat goes in <code>TELEGRAM_CHAT_ID</code>.</li>
            </ol>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Low-stock alert at (packs)"><Input inputMode="numeric" value={rules.lowStockUnits} onChange={(e) => setRules({ lowStockUnits: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Daily report after (hour, 24h)"><Input inputMode="numeric" value={rules.reportHour} onChange={(e) => setRules({ reportHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })} /></Field>
            </div>
            <label className="flex items-center gap-2"><Switch checked={rules.dailyReport} onCheckedChange={(v) => setRules({ dailyReport: v })} label="Daily report" />Daily report (sent the first time SIDDHIVYA is opened after that hour{rules.lastDailyReport ? ` · last sent ${rules.lastDailyReport}` : ""})</label>
            <label className="flex items-center gap-2"><Switch checked={rules.onApproval} onCheckedChange={(v) => setRules({ onApproval: v })} label="Publish alerts" />Tell the team when a product is sent live</label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={test}><Send />Send a test to {sellerName || "seller"}</Button>
              <Button variant="primary" onClick={() => void sendDailyReports().then(() => toast("Daily reports sent (see the log)."))}><BellRing />Send daily reports now</Button>
            </div>
            <details className="rounded-lg border border-line p-3"><summary className="cursor-pointer font-medium">Preview today&apos;s report for {sellerName}</summary><pre className="mt-2 text-[12.5px] whitespace-pre-wrap text-muted">{dailyReportText(seller, sellerName)}</pre></details>
          </div>
        </Card>
        <Card>
          <CardHeader title="WhatsApp offers" subtitle="Only to buyers who agreed to get messages. WhatsApp Status cannot be posted by any software." action={<Badge tone={waOn ? "pos" : "warn"}>{waOn ? "Cloud API connected" : "Cloud API not connected"}</Badge>} />
          <div className="space-y-4 px-5 pb-5 text-[13px]">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Buyer name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="WhatsApp number"><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="919876543210" /></Field>
              <Button onClick={addBuyer}><Plus />Add (said yes)</Button>
            </div>
            {buyers.length === 0 ? <EmptyState title="No opted-in buyers yet" body="Add buyers who asked to hear about offers — for example from the shop counter or past orders." /> : (
              <ul className="max-h-48 divide-y divide-line overflow-auto rounded-lg border border-line">
                {buyers.map((b) => <li key={b.id} className="flex items-center gap-2 px-3 py-1.5"><span className="flex-1">{b.name || "Buyer"} · <span className="text-muted">+{b.phone}</span></span><Button size="icon" variant="ghost" aria-label="Remove" onClick={() => useStore.setState((s) => ({ optIns: s.optIns.filter((x) => x.id !== b.id) }))}><Trash2 /></Button></li>)}
              </ul>
            )}
            {products.length > 0 && (
              <>
                <Field label="Offer for"><Select value={product?.id ?? ""} onChange={(e) => setLid(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
                <Field label="Message (edit on the product's WhatsApp listing)"><Textarea rows={3} readOnly value={offer} /></Field>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled={!buyers.length || busy} onClick={sendApi}><Send />{busy ? "Sending…" : `Send to ${buyers.length} via Cloud API`}</Button>
                </div>
                {buyers.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12px] text-muted">Without the Cloud API, send one by one from your own WhatsApp:</p>
                    <div className="flex flex-wrap gap-1.5">{buyers.slice(0, 30).map((b) => <a key={b.id} href={`https://wa.me/${b.phone}?text=${encodeURIComponent(`Hi ${b.name}, ${offer}`)}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[12px] hover:bg-raised"><MessageCircle className="size-3.5 text-[#0b8a5f]" />{b.name || b.phone}</a>)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader title="Alert log" subtitle="Every alert and report, and whether it was delivered." />
        {log.length === 0 ? <p className="px-5 pb-5 text-[13px] text-muted">Nothing sent yet.</p> : (
          <ul className="divide-y divide-line">
            {log.slice(0, 60).map((l) => <li key={l.id} className="flex flex-wrap items-start gap-3 px-5 py-2 text-[13px]"><Badge tone={l.status === "sent" ? "pos" : l.status === "failed" ? "neg" : "warn"}>{l.status === "sent" ? "Sent" : l.status === "failed" ? "Failed" : "Not set up"}</Badge><span className="text-muted">{l.to}</span><span className="min-w-0 flex-1 whitespace-pre-wrap">{l.text}</span><span className="text-[12px] text-faint">{fmtDateTime(l.ts)}</span></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
