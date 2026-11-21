"use client";
import { Download, Plus, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { PhotoThumb } from "@/components/launch/bits";
import { ScoreBars } from "@/components/launch/search-card";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, cn } from "@/components/ui";
import { SITE } from "@/config/site";
import { fmtDateTime } from "@/lib/dates";
import { aiSummary, searchScores } from "@/lib/launch/engine";
import { download, merchantFeed } from "@/lib/launch/files";
import { useSellers } from "@/lib/launch/state";
import type { VisibilityCheck } from "@/lib/launch/types";
import { newId, useStore } from "@/lib/store";

const ENGINES: VisibilityCheck["engine"][] = ["Google", "Google AI Overview", "ChatGPT", "Gemini", "Perplexity"];
const FIVE = [
  ["SEO", "Search engine optimisation", "Rank in Google and inside Amazon / Flipkart search."],
  ["AEO", "Answer engine optimisation", "Be the direct answer — Google snippets, voice assistants, \"People also ask\"."],
  ["GEO", "Generative engine optimisation", "Be named when people ask ChatGPT, Gemini or Perplexity."],
  ["AIO", "AI Overview optimisation", "Show inside Google's AI Overviews at the top of results."],
  ["AXO", "Agent experience optimisation", "Be readable by AI shopping agents that compare and buy for people."],
] as const;

export default function SearchPage() {
  const launches = useStore((s) => s.launches);
  const checks = useStore((s) => s.visibility);
  const sellers = useSellers();
  const [lid, setLid] = React.useState(launches[0]?.id ?? "");
  const [engine, setEngine] = React.useState<VisibilityCheck["engine"]>("ChatGPT");
  const [q, setQ] = React.useState("");
  const city = (clientId: string) => sellers.find((c) => c.id === clientId)?.city ?? "";
  const p = launches.find((x) => x.id === lid);
  const add = (found: boolean) => {
    if (!lid || !q.trim()) { toast("Pick a product and type the question you asked.", "error"); return; }
    useStore.setState((s) => ({ visibility: [{ id: newId(), launchId: lid, engine, question: q.trim(), found, ts: Date.now() }, ...s.visibility].slice(0, 500) }));
    setQ("");
  };
  const llms = () => download([`# ${SITE.company} — products`, "", ...launches.map((x) => aiSummary(x, city(x.clientId)))].join("\n\n"), "llms.txt");
  if (!launches.length) return (<><PageHeader title="Search Everywhere" /><Card><EmptyState icon={<Search />} title="No products yet" body="Add a product in One-Click Launch first." action={<Link href="/launch" className="text-[13px] font-medium text-accent">Open One-Click Launch</Link>} /></Card></>);
  const found = checks.filter((c) => c.found).length;
  return (
    <>
      <PageHeader title="Search Everywhere" description="Five ways buyers find a shop today — and what each product still needs. SIDDHIVYA writes the facts, questions and structured data; this page tracks whether search and AI engines actually show the shop." actions={
        <>
          <Button onClick={llms}><Download />llms.txt (all products)</Button>
          <Button variant="primary" onClick={() => download(merchantFeed(launches, SITE.url), "google-merchant-feed.tsv", "text/tab-separated-values")}><Download />Google Merchant feed</Button>
        </>
      } />
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        {FIVE.map(([id, name, plain]) => <Card key={id} className="p-4"><p className="text-[18px] font-extrabold text-accent">{id}</p><p className="text-[12px] font-semibold">{name}</p><p className="mt-1 text-[12px] text-muted">{plain}</p></Card>)}
      </div>
      <Card className="mb-4">
        <CardHeader title="Every product" subtitle="Scores are from the product's own content. Open a product to fix what is missing." />
        <div className="divide-y divide-line">
          {launches.map((x) => {
            const avg = Math.round(searchScores(x).reduce((a, s) => a + s.score, 0) / 5);
            return (
              <div key={x.id} className="px-5 py-4">
                <div className="mb-3 flex items-center gap-3"><PhotoThumb p={x} size={34} /><Link href={`/launch/${x.id}#search`} className="font-semibold hover:text-accent">{x.brand} {x.name}</Link><Badge tone={avg >= 80 ? "pos" : avg >= 50 ? "warn" : "neg"}>Average {avg}</Badge></div>
                <ScoreBars p={x} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader title="Are we being found? — visibility checks" subtitle={`Ask each engine the questions buyers ask and record the answer. ${checks.length ? `${found} of ${checks.length} checks found the shop.` : "Do this once a month per product."}`} />
        <div className="grid gap-3 px-5 pb-4 md:grid-cols-[1fr_180px_1.4fr_auto]">
          <Field label="Product"><Select value={lid} onChange={(e) => setLid(e.target.value)}>{launches.map((x) => <option key={x.id} value={x.id}>{x.brand} {x.name}</option>)}</Select></Field>
          <Field label="Engine"><Select value={engine} onChange={(e) => setEngine(e.target.value as VisibilityCheck["engine"])}>{ENGINES.map((e) => <option key={e}>{e}</option>)}</Select></Field>
          <Field label="Question asked"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={p ? `best ${p.name.toLowerCase()} to order online` : ""} /></Field>
          <div className="flex items-end gap-2"><Button variant="primary" onClick={() => add(true)}><Plus />Found</Button><Button onClick={() => add(false)}>Not found</Button></div>
        </div>
        {checks.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {checks.slice(0, 50).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-2 text-[13px]">
                <Badge tone={c.found ? "pos" : "neg"}>{c.found ? "Found" : "Not found"}</Badge>
                <span className="font-medium">{c.engine}</span>
                <span className={cn("min-w-0 flex-1 truncate text-muted")}>&quot;{c.question}&quot; — {launches.find((x) => x.id === c.launchId)?.name ?? "deleted product"}</span>
                <span className="text-[12px] text-faint">{fmtDateTime(c.ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
