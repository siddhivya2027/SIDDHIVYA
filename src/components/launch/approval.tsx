"use client";
import { Check, Copy, MessageCircle, PhoneCall, Send, ShieldCheck } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/shared";
import { APPROVAL } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, Field, Input, Segmented } from "@/components/ui";
import { SITE } from "@/config/site";
import { fmtDateTime } from "@/lib/dates";
import { CH } from "@/lib/launch/channels";
import { adAmounts, profitOn } from "@/lib/launch/engine";
import { thumbnail } from "@/lib/launch/media";
import { patchLaunch, setSellerSetup, useSellers, useSetup } from "@/lib/launch/state";
import type { LaunchProduct } from "@/lib/launch/types";
import { useStore } from "@/lib/store";

export function ApprovalCard({ p }: { p: LaunchProduct }) {
  const setup = useSetup(p.clientId);
  const sellers = useSellers();
  const session = useStore((s) => s.session);
  const log = useStore((s) => s.log);
  const seller = sellers.find((c) => c.id === p.clientId);
  const [busy, setBusy] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [decision, setDecision] = React.useState<"approved" | "changes">("approved");
  const phone = setup?.phone ?? "";
  const a = p.approval;

  const send = async () => {
    setBusy(true);
    try {
      const thumb = p.photos[0] ? await thumbnail(p.photos[0].src, 80, 0.5) : undefined;
      const on = p.listings.filter((l) => l.enabled);
      const body = {
        lid: p.id, seller: seller?.name ?? p.brand, agency: SITE.company, agencyPhone: SITE.contact.whatsapp,
        product: `${p.brand} ${p.name}`.trim(), size: p.size, price: p.price, stock: p.stock,
        channels: on.map((l) => { const f = profitOn(p, l); return { id: l.channel, label: CH[l.channel].label, price: l.price, profit: f ? Math.round(f.profit) : null }; }),
        adsPerDay: adAmounts(p.ads).reduce((x, r) => x + r.perDay, 0), thumb,
      };
      const res = await fetch("/api/v1/approvals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json()) as { token?: string; signed?: boolean; error?: string };
      if (!res.ok || !j.token) throw new Error(j.error || "Could not create the link.");
      const link = `${window.location.origin}/approve/${j.token}`;
      patchLaunch(p.id, (x) => ({ ...x, approval: { state: "sent", token: j.token, link, signed: j.signed, sentAt: Date.now() } }));
      log("Sent product to seller for approval", `${p.name} → ${seller?.name ?? ""}`);
      toast("Approval link ready. Send it on WhatsApp.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create the link.", "error");
    } finally { setBusy(false); }
  };

  const waText = a.link ? `Hello ${seller?.contact.name ?? ""}, your product ${p.name} (${p.size}) is ready to go live on ${p.listings.filter((l) => l.enabled).length} apps. Please check the price and tap APPROVE:\n${a.link}` : "";
  const check = async () => {
    if (!a.token) return;
    try {
      const res = await fetch("/api/v1/approvals/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: a.token, receipt: code, decision }) });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) { toast(j.error || "That code does not match. Check it with the seller.", "error"); return; }
      patchLaunch(p.id, (x) => ({ ...x, approval: { ...x.approval, state: decision, receipt: code.toUpperCase(), decidedAt: Date.now(), by: seller?.name } }));
      log(decision === "approved" ? "Seller approval confirmed by code" : "Seller asked for changes (code confirmed)", p.name);
      setCode("");
    } catch { toast("Could not check the code.", "error"); }
  };
  const byCall = () => {
    patchLaunch(p.id, (x) => ({ ...x, approval: { ...x.approval, state: "approved", decidedAt: Date.now(), by: `${seller?.name ?? "Seller"} (by phone, noted by ${session?.name ?? "team"})`, note: "Approved on a phone call" } }));
    log("Marked seller approval from a phone call", p.name);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(a.link ?? ""); toast("Link copied."); } catch { toast("Copy failed.", "error"); } };

  return (
    <Card>
      <CardHeader title="8 · Seller approval" subtitle="The seller sees the product, the price on every app and his profit — and taps APPROVE on his phone. Nothing goes live before that." action={<Badge tone={APPROVAL[a.state].tone}>{APPROVAL[a.state].label}</Badge>} />
      <div className="space-y-4 px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Seller's WhatsApp number (with country code)" hint="Saved for this seller.">
            <Input inputMode="tel" value={phone} placeholder="919876543210" onChange={(e) => setSellerSetup(p.clientId, (s) => ({ ...s, phone: e.target.value.replace(/[^\d]/g, "") }))} />
          </Field>
          <Button variant="primary" onClick={send} disabled={busy}><Send />{busy ? "Preparing…" : a.state === "not_sent" ? "Send for approval" : "Send a fresh link"}</Button>
        </div>
        {a.link && (
          <div className="rounded-lg border border-line bg-raised/60 p-3 text-[13px]">
            <p className="font-medium">Approval link {a.signed ? <Badge tone="pos"><ShieldCheck />Signed</Badge> : <Badge tone="warn">Unsigned — set APPROVAL_SECRET</Badge>}</p>
            <p className="mt-1 truncate text-muted">{a.link}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={copy}><Copy />Copy</Button>
              {phone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#0b8a5f] px-2.5 text-[12.5px] font-medium text-white"><MessageCircle className="size-3.5" />Send on WhatsApp</a>}
              <a href={a.link} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-md border border-line px-2.5 text-[12.5px] font-medium">Open as the seller sees it</a>
            </div>
            {a.sentAt && <p className="mt-2 text-[12px] text-faint">Sent {fmtDateTime(a.sentAt)}. If the seller opens it on this same computer, this page updates by itself. From his phone, he sends back an 8-character code — enter it below.</p>}
          </div>
        )}
        {a.state === "sent" && (
          <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <Segmented label="Seller's answer" value={decision} onChange={setDecision} options={[{ value: "approved", label: "Approved" }, { value: "changes", label: "Changes" }]} />
            <Field label="Code from the seller"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="A7K3-92QX" /></Field>
            <Button onClick={check} disabled={code.length < 8}><Check />Confirm</Button>
          </div>
        )}
        {(a.state === "sent" || a.state === "not_sent") && <Button variant="ghost" onClick={byCall}><PhoneCall />Seller approved on a phone call</Button>}
        {(a.state === "approved" || a.state === "changes") && (
          <p className="text-[13px] text-muted">{a.state === "approved" ? "Approved" : "Changes asked"} by {a.by ?? "seller"}{a.decidedAt ? ` · ${fmtDateTime(a.decidedAt)}` : ""}{a.receipt ? ` · code ${a.receipt}` : ""}{a.note ? ` · "${a.note}"` : ""}</p>
        )}
      </div>
    </Card>
  );
}
