"use client";
import { CheckCircle2, Circle, Copy, ExternalLink, Hand, Rocket, Sun } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/shared";
import { copyText } from "@/components/launch/manual-keywords";
import { PhotoThumb } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { marketplaceNames } from "@/lib/launch/engine";
import { GROUPS, playbookTasks, salesHealth, type Verdict } from "@/lib/launch/manual";
import { manualToOrders, sampleOrders } from "@/lib/launch/orders";
import { tickTask, useSellers } from "@/lib/launch/state";
import { useStore } from "@/lib/store";
import { LIVE } from "@/lib/live/mode";
import { useLiveOrders } from "@/lib/live/orders";

const TONE: Record<Verdict, "neg" | "warn" | "pos" | "neutral"> = { slow: "neg", too_early: "warn", ok: "pos", not_live: "neutral" };
const LABEL: Record<Verdict, string> = { slow: "Customers not coming", too_early: "Just started", ok: "Selling", not_live: "Not live yet" };

/**
 * MANUAL PUSH — the backup plan when automation is not enough.
 * Shows which products are not getting buyers, and a tick-off list of things a person does by hand,
 * each with the exact message or keywords ready to copy.
 */
export default function ManualPage() {
  const launches = useStore((s) => s.launches);
  const playbook = useStore((s) => s.playbook);
  const setup = useStore((s) => s.sellerSetup);
  const manualAll = useStore((s) => s.manualOrders);
  const me = useStore((s) => s.session?.name ?? "Team");
  const sellers = useSellers();
  const [seller, setSeller] = React.useState("all");
  const live = useLiveOrders(seller === "all" ? undefined : seller);
  const mine = launches.filter((l) => seller === "all" || l.clientId === seller);
  const orders = React.useMemo(() => [...manualToOrders(manualAll), ...(LIVE ? live.orders : launches.flatMap((p) => sampleOrders(p)))], [manualAll, live.orders, launches]);
  const rows = mine.map((p) => ({ p, h: salesHealth(p, orders.filter((o) => o.launchId === p.id)) }))
    .sort((a, b) => ["slow", "too_early", "not_live", "ok"].indexOf(a.h.verdict) - ["slow", "too_early", "not_live", "ok"].indexOf(b.h.verdict));
  const [lid, setLid] = React.useState("");
  const pick = rows.find((r) => r.p.id === lid) ?? rows[0];
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [onlyDaily, setOnlyDaily] = React.useState(false);

  if (!launches.length) return (
    <>
      <PageHeader title="Manual push" description="The backup plan when automation is not enough." />
      <Card><EmptyState icon={<Rocket />} title="No products yet" body="Add a product in One-Click Launch first." action={<Link href="/launch" className="text-[13px] font-medium text-accent">Go to One-Click Launch</Link>} /></Card>
    </>
  );

  const p = pick?.p;
  const s = p ? sellers.find((c) => c.id === p.clientId) : undefined;
  const tasks = p ? playbookTasks(p, { sellerName: s?.name ?? p.brand, city: s?.city ?? "", phone: setup[p.clientId]?.phone, where: marketplaceNames(p) }) : [];
  const done = p ? playbook.find((x) => x.id === p.id)?.done ?? {} : {};
  const shown = tasks.filter((t) => !onlyDaily || t.daily);
  const doneCount = tasks.filter((t) => done[t.id]).length;

  return (
    <>
      <PageHeader title="Manual push" description="When buyers aren't coming — the area is small, Google and AI search haven't picked the shop up yet, or an app's automation failed — do these by hand. Every step has the message or keywords ready to copy. Ticks are saved for the whole team." actions={
        <Select aria-label="Seller" value={seller} onChange={(e) => { setSeller(e.target.value); setLid(""); }} className="w-48"><option value="all">All sellers</option>{sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      } />
      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <Card className="self-start">
          <CardHeader title="Products — slowest first" subtitle="'Customers not coming' = live 3+ days and fewer than 3 orders in 7 days (app + hand orders)." />
          <ul className="divide-y divide-line">
            {rows.map(({ p: x, h }) => (
              <li key={x.id}>
                <button type="button" onClick={() => setLid(x.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] hover:bg-raised ${pick?.p.id === x.id ? "bg-raised" : ""}`}>
                  <PhotoThumb p={x} size={40} />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{x.name || "Unnamed"} <span className="text-muted">{x.size}</span></p><p className="text-[12px] text-muted">{h.orders7} orders in 7 days{h.daysLive ? ` · live ${h.daysLive} d` : ""}</p></div>
                  <Badge tone={TONE[h.verdict]}>{LABEL[h.verdict]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {p && pick && (
          <div className="min-w-0 space-y-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <PhotoThumb p={p} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{p.brand} {p.name} <span className="font-normal text-muted">{p.size}</span></p>
                  <p className="text-[13px] text-muted">{pick.h.text}</p>
                </div>
                <div className="text-right"><p className="text-[22px] font-semibold tnum">{doneCount}/{tasks.length}</p><p className="text-[12px] text-muted">steps done</p></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
                <Link href={`/launch/${p.id}#manual`} className="inline-flex items-center gap-1 font-medium text-accent"><Hand className="size-3.5" />Edit manual words</Link>
                <span className="text-faint">·</span>
                <Link href={`/launch/${p.id}#publish`} className="font-medium text-accent">Mark a channel "done by hand"</Link>
                <span className="text-faint">·</span>
                <Link href="/orders" className="font-medium text-accent">Add an order by hand</Link>
                <label className="ml-auto flex items-center gap-1.5 text-muted"><input type="checkbox" checked={onlyDaily} onChange={(e) => setOnlyDaily(e.target.checked)} /><Sun className="size-3.5" />Only daily steps</label>
              </div>
            </Card>
            {GROUPS.map((g) => {
              const list = shown.filter((t) => t.group === g);
              if (!list.length) return null;
              return (
                <Card key={g}>
                  <CardHeader title={g} subtitle={`${list.filter((t) => done[t.id]).length} of ${list.length} done`} />
                  <ul className="divide-y divide-line">
                    {list.map((t) => {
                      const d = done[t.id];
                      return (
                        <li key={t.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <button type="button" aria-label={d ? "Mark not done" : "Mark done"} onClick={() => tickTask(p, t.id, me, notes[`${p.id}:${t.id}`] ?? d?.note ?? "", !d)} className="mt-0.5 shrink-0">{d ? <CheckCircle2 className="size-5 text-pos" /> : <Circle className="size-5 text-faint" />}</button>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[14px] font-semibold ${d ? "text-muted line-through" : ""}`}>{t.title} {t.daily && <Badge tone="accent">Daily / weekly</Badge>}</p>
                              <p className="mt-0.5 text-[12.5px] text-muted">{t.why}</p>
                              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12.5px]">{t.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                              {t.copy && (
                                <div className="mt-2 rounded-lg border border-line bg-raised p-3">
                                  <pre className="max-h-48 overflow-auto text-[12px] whitespace-pre-wrap">{t.copy}</pre>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => void copyText(t.copy ?? "")}><Copy />Copy</Button>
                                    {t.link && <a href={t.link.href} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-surface"><ExternalLink className="size-3.5" />{t.link.label}</a>}
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <Input className="h-8 text-[12.5px]" placeholder="Note (what you did, result, link)" value={notes[`${p.id}:${t.id}`] ?? d?.note ?? ""} onChange={(e) => setNotes({ ...notes, [`${p.id}:${t.id}`]: e.target.value })} onBlur={() => { if (d && notes[`${p.id}:${t.id}`] !== undefined && notes[`${p.id}:${t.id}`] !== d.note) tickTask(p, t.id, me, notes[`${p.id}:${t.id}`]); }} />
                              </div>
                              {d && <p className="mt-1 text-[11.5px] text-faint">Done by {d.by} · {fmtDateTime(d.at)}</p>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
