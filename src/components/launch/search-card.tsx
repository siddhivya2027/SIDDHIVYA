"use client";
import { Copy, Download, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/components/shared";
import { Button, Card, CardHeader, Input, Textarea, cn } from "@/components/ui";
import { SITE } from "@/config/site";
import { searchScores, structuredData, writeFaq } from "@/lib/launch/engine";
import { download, searchPack } from "@/lib/launch/files";
import { patchLaunch, useSellers } from "@/lib/launch/state";
import type { LaunchProduct } from "@/lib/launch/types";

export function ScoreBars({ p }: { p: LaunchProduct }) {
  const scores = searchScores(p);
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {scores.map((s) => (
        <div key={s.id} className="rounded-lg border border-line p-3">
          <div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{s.id}</p><p className={cn("tnum text-[18px] font-bold", s.score >= 80 ? "text-pos" : s.score >= 50 ? "text-warn" : "text-neg")}>{s.score}</p></div>
          <p className="mt-0.5 text-[11.5px] text-muted">{s.plain}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised"><div className={cn("h-full rounded-full", s.score >= 80 ? "bg-pos" : s.score >= 50 ? "bg-warn" : "bg-neg")} style={{ width: `${s.score}%` }} /></div>
          {s.todo[0] && <p className="mt-2 text-[11.5px] text-ink">Next: {s.todo[0]}</p>}
        </div>
      ))}
    </div>
  );
}

export function SearchCard({ p }: { p: LaunchProduct }) {
  const sellers = useSellers();
  const city = sellers.find((c) => c.id === p.clientId)?.city ?? "";
  const setFaq = (faq: LaunchProduct["faq"]) => patchLaunch(p.id, (x) => ({ ...x, faq }));
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Copied."); } catch { toast("Copy failed — select and copy by hand.", "error"); } };
  return (
    <Card>
      <CardHeader title="6 · Search everywhere — 5 ways to be found" subtitle="SEO (Google & marketplace search), AEO (direct answers), GEO (ChatGPT, Gemini), AIO (Google AI Overviews), AXO (AI shopping agents)." action={
        <>
          <Button onClick={() => copy(structuredData(p, SITE.url))}><Copy />Copy structured data</Button>
          <Button onClick={() => download(searchPack(p, city, SITE.url), `${p.sku || p.id}-search-pack.txt`)}><Download />Search pack</Button>
        </>
      } />
      <div className="space-y-4 px-5 pb-5">
        <ScoreBars p={p} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold">Questions buyers ask ({p.faq.length})</p>
          <div className="flex gap-2">
            <Button variant="ai" onClick={() => setFaq(writeFaq(p, city))}><Sparkles />Write FAQ from the product</Button>
            <Button onClick={() => setFaq([...p.faq, { q: "", a: "" }])}><Plus />Add</Button>
          </div>
        </div>
        {p.faq.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_1.4fr_auto]">
            <Input aria-label="Question" value={f.q} placeholder="Question" onChange={(e) => setFaq(p.faq.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
            <Textarea aria-label="Answer" rows={2} value={f.a} placeholder="Short answer" onChange={(e) => setFaq(p.faq.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
            <Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => setFaq(p.faq.filter((_, k) => k !== i))}><Trash2 /></Button>
          </div>
        ))}
        <p className="text-[12px] text-faint">No one can promise a ranking or an AI mention. SIDDHIVYA makes the facts complete and machine-readable, and the Search Everywhere page tracks whether AI engines name the shop.</p>
      </div>
    </Card>
  );
}
