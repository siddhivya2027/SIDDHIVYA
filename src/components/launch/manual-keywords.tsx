"use client";
import { Copy, Hand, RotateCcw } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/shared";
import { useUpdate } from "@/components/launch/product-form";
import { Badge, Button, Card, CardHeader, Field, Textarea } from "@/components/ui";
import { AMAZON_BACKEND_MAX, keywordPack } from "@/lib/launch/manual";
import { useSellers } from "@/lib/launch/state";
import type { LaunchProduct } from "@/lib/launch/types";

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); toast("Copied."); } catch { toast("Copy failed — select the text and copy.", "error"); }
}
const bytes = (s: string) => new TextEncoder().encode(s).length;
type Key = "amazonBackend" | "adKeywords" | "negativeKeywords" | "hashtags";

/**
 * MANUAL WORDS: what SIDDHIVYA writes by itself is shown, and the team can type their own words over it.
 * If the automatic words don't bring buyers (SEO/GEO not working in that area), the typed words win everywhere.
 */
export function ManualKeywordsCard({ p }: { p: LaunchProduct }) {
  const up = useUpdate(p.id);
  const city = useSellers().find((c) => c.id === p.clientId)?.city ?? "";
  const k = keywordPack(p, city);
  const m = p.manualSearch ?? {};
  const setM = (key: Key, v: string) => up((x) => ({ ...x, manualSearch: { ...x.manualSearch, [key]: v } }));
  const rows: { key: Key; label: string; auto: string; hint: string; isManual: boolean }[] = [
    { key: "amazonBackend", label: "Amazon search terms (backend box)", auto: k.amazonBackend, hint: `Seller Central → Edit → Keywords → Search terms. Max ${AMAZON_BACKEND_MAX + 1} bytes, no brand, spaces only.`, isManual: k.manual.amazonBackend },
    { key: "adKeywords", label: "Ad keywords (Amazon / Flipkart / Google — manual targeting)", auto: k.adKeywords.join("\n"), hint: "One per line. Start with phrase match.", isManual: k.manual.adKeywords },
    { key: "negativeKeywords", label: "Negative keywords (block these searches)", auto: k.negative.join("\n"), hint: "Searches that waste ad money, e.g. recipe, free.", isManual: k.manual.negative },
    { key: "hashtags", label: "Hashtags for Instagram / Facebook", auto: k.hashtags, hint: "Used in the Instagram caption.", isManual: k.manual.hashtags },
  ];
  return (
    <Card>
      <CardHeader title="7 · Manual words — when automatic search isn't enough" subtitle="Your own keywords win over the automatic ones everywhere: listings' backend, ads, hashtags, posts. Fill the town and local names on step 1 first." action={<Badge tone="ai"><Hand className="size-3" />Manual</Badge>} />
      <div className="space-y-5 px-5 pb-5">
        <div className="rounded-lg border border-line p-3">
          <div className="mb-1.5 flex items-center justify-between"><p className="text-[13px] font-semibold">Local search words ({k.local.length})</p><Button size="sm" variant="ghost" onClick={() => void copyText(k.local.join("\n"))}><Copy />Copy</Button></div>
          {k.local.length ? <p className="text-[12.5px] text-muted">{k.local.join(" · ")}</p> : <p className="text-[12.5px] text-warn">Add the product name and the town (step 1) to get local words.</p>}
        </div>
        {rows.map((r) => {
          const val = m[r.key] ?? "";
          return (
            <Field key={r.key} label={r.label} hint={r.hint}>
              <div className="space-y-1.5">
                <Textarea rows={r.key === "adKeywords" || r.key === "negativeKeywords" ? 5 : 2} value={val} placeholder={`Automatic: ${r.auto.slice(0, 400)}`} onChange={(e) => setM(r.key, e.target.value)} />
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  {r.isManual ? <Badge tone="ai">Using your words</Badge> : <Badge>Using automatic words</Badge>}
                  {r.key === "amazonBackend" && <span className={bytes(k.amazonBackend) > AMAZON_BACKEND_MAX ? "text-neg" : "text-faint"}>{bytes(k.amazonBackend)}/{AMAZON_BACKEND_MAX + 1} bytes{r.isManual && bytes(val.trim()) > AMAZON_BACKEND_MAX ? " — extra words were dropped to fit" : ""}</span>}
                  <Button size="sm" variant="ghost" onClick={() => void copyText(r.key === "amazonBackend" ? k.amazonBackend : r.key === "adKeywords" ? k.adKeywords.join("\n") : r.key === "negativeKeywords" ? k.negative.join("\n") : k.hashtags)}><Copy />Copy what is used</Button>
                  {r.isManual && <Button size="sm" variant="ghost" onClick={() => setM(r.key, "")}><RotateCcw />Back to automatic</Button>}
                </div>
              </div>
            </Field>
          );
        })}
        <div className="rounded-lg bg-raised p-3 text-[12.5px] text-muted">
          <p className="font-semibold text-ink">Check AI search by hand</p>
          <p className="mt-1">Ask these in ChatGPT, Gemini, Perplexity and Google, and note the result on Search Everywhere:</p>
          <ul className="mt-1 list-disc pl-5">{k.aiQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      </div>
    </Card>
  );
}
