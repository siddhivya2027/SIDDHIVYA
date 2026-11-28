"use client";
import { ClipboardCheck, Handshake, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { SellerChecklist } from "@/components/live/seller-checklist";
import { checklistStatus, doneCount, isFoodBusiness, SELLER_CHECKLIST } from "@/lib/launch/onboarding";
import { SITE } from "@/config/site";
import Link from "next/link";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { TempPassword } from "@/components/live/temp-password";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal } from "@/components/ui";
import type { Client } from "@/lib/demo/types";
import { emptySetup, setSellerSetup, useSellers } from "@/lib/launch/state";
import { newId, useStore } from "@/lib/store";

type Draft = { id?: string; name: string; city: string; industry: string; contactName: string; email: string; phone: string };
const empty: Draft = { name: "", city: "", industry: "Indian sweets", contactName: "", email: "", phone: "" };

export default function SellersPage() {
  const sellers = useSellers();
  const [checkFor, setCheckFor] = React.useState<string | null>(null);
  const launches = useStore((s) => s.launches);
  const setup = useStore((s) => s.sellerSetup);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [temp, setTemp] = React.useState<{ name: string; email: string; password: string; phone?: string } | null>(null);
  const save = () => {
    if (!draft || draft.name.trim().length < 2) { toast("Enter the seller's business name.", "error"); return; }
    const id = draft.id ?? newId();
    const prev = sellers.find((c) => c.id === id);
    const c: Client = { id, name: draft.name.trim(), industry: draft.industry.trim(), city: draft.city.trim(), since: prev?.since ?? new Date().toISOString().slice(0, 10), status: prev?.status ?? "onboarding", contact: { name: draft.contactName.trim(), email: draft.email.trim().toLowerCase() }, team: prev?.team ?? [], hue: prev?.hue ?? Math.floor(Math.random() * 360), retainer: prev?.retainer ?? 0, demoData: false };
    useStore.setState((s) => ({ customClients: [c, ...s.customClients.filter((x) => x.id !== id)] }));
    setSellerSetup(id, (x) => ({ ...x, phone: draft.phone.replace(/[^\d]/g, "") }));
    setDraft(null);
  };
  const remove = (c: Client) => {
    if (launches.some((l) => l.clientId === c.id)) { toast("This seller has products. Delete or move them first.", "error"); return; }
    if (window.confirm(`Remove ${c.name}?`)) useStore.setState((s) => ({ customClients: s.customClients.filter((x) => x.id !== c.id) }));
  };
  const makeLogin = async (c: Client) => {
    if (!c.contact.email) { toast("Add the seller's email first (Edit).", "error"); return; }
    const r = await fetch("/api/v1/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: c.contact.name || c.name, email: c.contact.email, role: "seller", clientId: c.id }) });
    const j = (await r.json()) as { tempPassword?: string; error?: string };
    if (!r.ok || !j.tempPassword) { toast(j.error || "Could not create the login.", "error"); return; }
    setTemp({ name: c.contact.name || c.name, email: c.contact.email, password: j.tempPassword, phone: setup[c.id]?.phone });
  };
  return (
    <>
      <PageHeader title="Sellers" description="Every business the agency sells for. Each seller can get their own login to see their products, approve them, and see orders and money." actions={<Button variant="primary" onClick={() => setDraft({ ...empty })}><Plus />Add seller</Button>} />
      <Card>
        <CardHeader title={`${sellers.length} seller${sellers.length === 1 ? "" : "s"}`} />
        {sellers.length === 0 ? <EmptyState icon={<Handshake />} title="No sellers yet" body="Add the first seller — for example the sweet shop near Vijayawada." action={<Button variant="primary" onClick={() => setDraft({ ...empty })}><Plus />Add seller</Button>} /> : (
          <ul className="divide-y divide-line">
            {sellers.map((c) => {
              const n = launches.filter((l) => l.clientId === c.id).length;
              const st = setup[c.id];
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                  <span className="flex size-9 items-center justify-center rounded-lg text-[12px] font-bold text-white" style={{ background: `hsl(${c.hue} 45% 45%)` }}>{c.name.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name} <span className="font-normal text-muted">· {c.city || "—"} · {c.industry}</span></p>
                    <p className="text-muted">{c.contact.name || "No contact"}{c.contact.email ? ` · ${c.contact.email}` : ""}{st?.phone ? ` · +${st.phone}` : ""}</p>
                  </div>
                  <Badge>{n} product{n === 1 ? "" : "s"}</Badge>
                  {(() => { const cs = checklistStatus(st ?? emptySetup(), { email: c.contact.email, maxPhotos: Math.max(0, ...launches.filter((l) => l.clientId === c.id).map((l) => l.photos.length)), agencyPhones: SITE.contact.phones, isFood: isFoodBusiness(c.industry) }); const n = doneCount(cs); return <button type="button" onClick={() => setCheckFor(c.id)} className="inline-flex items-center gap-1"><Badge tone={n === SELLER_CHECKLIST.length ? "pos" : n >= 5 ? "warn" : "neg"}><ClipboardCheck className="size-3" />Checklist {n}/{SELLER_CHECKLIST.length}</Badge></button>; })()}
                  <Link href="/channels" className="text-[12.5px] font-medium text-accent">Set-up & keys</Link>
                  <Button size="sm" onClick={() => void makeLogin(c)}><KeyRound />Give login</Button>
                  <Button size="icon" variant="ghost" aria-label="Edit seller" onClick={() => setDraft({ id: c.id, name: c.name, city: c.city, industry: c.industry, contactName: c.contact.name, email: c.contact.email, phone: st?.phone ?? "" })}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Remove seller" onClick={() => remove(c)}><Trash2 /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Modal open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }} title={draft?.id ? "Edit seller" : "Add seller"} footer={<><Button onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" className="sm:col-span-2"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Sri Lakshmi Sweets" /></Field>
            <Field label="Town / city"><Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Vijayawada" /></Field>
            <Field label="What they sell"><Input value={draft.industry} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} /></Field>
            <Field label="Owner's name"><Input value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} /></Field>
            <Field label="Owner's WhatsApp (with 91)"><Input inputMode="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            <Field label="Owner's email (for their login)" className="sm:col-span-2"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <TempPassword info={temp} onClose={() => setTemp(null)} />
      <SellerChecklist sellerId={checkFor} onClose={() => setCheckFor(null)} />
    </>
  );
}
