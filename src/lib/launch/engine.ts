/**
 * The launch engine: pure functions, no I/O. Writes a listing for every channel, works out profit after each
 * channel's fees, checks what is missing before selling, and builds the search assets (FAQ, structured data,
 * AI summary, search scores). Everything here is deterministic so the same product always gives the same output.
 */
import { cleanTitle } from "@/lib/site/listing-check";
import { calculate, FEE_CONFIGS, type FeeResult } from "@/lib/site/fees";
import { CH, CHANNELS } from "./channels";
import type { AdPlan, ChannelId, ChannelListing, FoodCategory, LaunchProduct, SellerSetup } from "./types";

export const FOOD_LABEL: Record<FoodCategory, string> = { sweets: "Indian sweets", snacks: "Snacks & namkeen", pickles: "Pickles", spices: "Spices & masalas", other_food: "Other packaged food", non_food: "Not food" };
export const isFood = (p: Pick<LaunchProduct, "category">) => p.category !== "non_food";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const sentence = (s: string) => { const t = clean(s); return t ? (t[0].toUpperCase() + t.slice(1)).replace(/([^.!?])$/, "$1.") : ""; };
const words = (s: string) => s.split(/[,;\n]/).map(clean).filter(Boolean);
const lowerFirst = (s: string) => { const t = clean(s); return t ? t[0].toLowerCase() + t.slice(1) : ""; };
const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n) > n * 0.6 ? s.lastIndexOf(" ", n) : n).replace(/[\s,|–-]+$/, ""));

export function newLaunch(id: string, clientId: string, brand: string): LaunchProduct {
  const now = Date.now();
  return {
    id, clientId, createdAt: now, updatedAt: now,
    name: "", brand, category: "sweets", sku: "", size: "250 g", weightGrams: 300,
    price: 0, mrp: 0, cost: 0, gstPct: 0.05, stock: 0, shelfLifeDays: 30,
    ingredients: "", story: "", keyPoints: [], keywords: "",
    photos: [], amazonProductType: "", flipkartFsn: "",
    listings: [], ads: defaultAds(), approval: { state: "not_sent" }, jobs: {}, faq: [],
  };
}
export function defaultAds(): AdPlan { return { dailyBudget: 500, split: { meta: 0.5, amazon_ads: 0.3, flipkart_ads: 0.2 }, days: 14 }; }

/* ---------- Listing writer ---------- */
function titleFor(p: LaunchProduct, ch: ChannelId): string {
  const info = CH[ch];
  const kw = words(p.keywords).slice(0, 2);
  const parts = [`${p.brand} ${p.name}`.trim(), ...kw, p.size].filter(Boolean);
  const raw = parts.join(info.kind === "quick" ? " " : ", ");
  if (ch === "amazon" || ch === "flipkart") return cleanTitle(raw, ch, info.titleMax);
  return cut(clean(raw), info.titleMax);
}

function autoPoints(p: LaunchProduct): string[] {
  const pts = [...p.keyPoints.map(clean).filter(Boolean)];
  if (p.ingredients) pts.push(`Made with ${lowerFirst(p.ingredients).replace(/\.$/, "")}`);
  if (p.size) pts.push(`Net quantity: ${p.size} per pack`);
  if (isFood(p) && p.shelfLifeDays) pts.push(`Best before ${p.shelfLifeDays} days from packing. Store in a cool, dry place${p.category === "sweets" ? "; refrigerate after opening" : ""}`);
  if (p.story) pts.push(sentence(p.story).replace(/\.$/, ""));
  return [...new Set(pts)];
}

function descriptionFor(p: LaunchProduct): string {
  return [
    sentence(p.story),
    p.ingredients ? `Ingredients: ${sentence(p.ingredients)}` : "",
    p.size ? `Each pack holds ${p.size}.` : "",
    isFood(p) && p.shelfLifeDays ? `Best before ${p.shelfLifeDays} days from the packing date printed on the box.` : "",
  ].filter(Boolean).join(" ");
}

const tags = (p: LaunchProduct) => [p.brand, p.name, ...words(p.keywords)].map((w) => "#" + w.replace(/[^\p{L}\p{N}]/gu, "")).filter((t) => t.length > 2).slice(0, 8).join(" ");

export function captionFor(p: LaunchProduct, ch: "facebook" | "instagram" | "whatsapp", where: string[] = []): string {
  const price = p.price ? `Rs ${p.price.toLocaleString("en-IN")}` : "";
  const shops = where.length ? `Order now on ${where.join(", ")}.` : "Order now.";
  if (ch === "whatsapp") return cut(`${p.name} ${p.size} — ${price}. ${shops}`, 300);
  const body = [`${p.brand} ${p.name} (${p.size})`, sentence(p.story), p.ingredients ? `Made with ${lowerFirst(p.ingredients).replace(/\.$/, "")}.` : "", price ? `${price} · ${shops}` : shops].filter(Boolean).join("\n\n");
  return ch === "instagram" ? `${body}\n\n${tags(p)}` : body;
}

/** Writes (or refreshes) a listing for every channel. Listings a person edited are kept as they are. */
export function writeListings(p: LaunchProduct, onChannels?: ChannelId[]): ChannelListing[] {
  const pts = autoPoints(p);
  const desc = descriptionFor(p);
  const isOn = (id: ChannelId) => (onChannels ? onChannels.includes(id) : p.listings.find((l) => l.channel === id)?.enabled ?? CH[id].kind !== "quick");
  // Quick-delivery apps hold their own warehouse stock: by default 20% of the stock is split across the ones switched on.
  const quickOn = CHANNELS.filter((c) => c.kind === "quick" && isOn(c.id));
  const quickEach = quickOn.length ? Math.floor((p.stock * 0.2) / quickOn.length) : 0;
  const shopStock = p.stock - quickEach * quickOn.length;
  const where = CHANNELS.filter((c) => (c.kind === "marketplace" || c.kind === "quick") && isOn(c.id)).map((c) => c.label);
  return CHANNELS.map((info) => {
    const prev = p.listings.find((l) => l.channel === info.id);
    const enabled = isOn(info.id);
    if (prev?.edited) return { ...prev, enabled };
    const stock = info.kind === "quick" ? (enabled ? quickEach : 0) : info.kind === "marketplace" ? shopStock : 0;
    return {
      channel: info.id, enabled,
      title: info.kind === "social" ? cut(`${p.brand} ${p.name} ${p.size}`.trim(), info.titleMax) : titleFor(p, info.id),
      bullets: info.bulletCount ? pts.slice(0, info.bulletCount) : [],
      description: info.id === "facebook" || info.id === "instagram" || info.id === "whatsapp" ? captionFor(p, info.id, where) : desc,
      price: Math.round(p.price),
      stock,
    };
  });
}

/* ---------- Profit after each channel's fees ---------- */
export function profitOn(p: LaunchProduct, l: Pick<ChannelListing, "channel" | "price">): FeeResult | null {
  const info = CH[l.channel];
  if (!info.fees || !l.price) return null;
  return calculate(FEE_CONFIGS[info.fees], {
    price: l.price, cost: p.cost, categoryId: info.foodCategory ?? FEE_CONFIGS[info.fees].categories[0].id,
    weightGrams: p.weightGrams, zone: "national", productGstPct: p.gstPct,
  });
}

/* ---------- Ready-to-sell checks ---------- */
export type CheckLevel = "block" | "warn" | "ok";
export interface Check { level: CheckLevel; text: string; channel?: ChannelId }

const monthsUntil = (iso: string) => (iso ? (new Date(iso).getTime() - Date.now()) / (30.44 * 86400000) : -1);

export function readiness(p: LaunchProduct, s: SellerSetup | undefined): Check[] {
  const out: Check[] = [];
  const on = p.listings.filter((l) => l.enabled);
  if (!p.name) out.push({ level: "block", text: "Product name is missing." });
  if (!p.price) out.push({ level: "block", text: "Selling price is missing." });
  if (p.mrp && p.price > p.mrp) out.push({ level: "block", text: "Selling price is higher than MRP — marketplaces reject this." });
  if (!p.photos.length) out.push({ level: "block", text: "Add at least one product photo." });
  else if (p.photos.length < 3) out.push({ level: "warn", text: `Only ${p.photos.length} photo${p.photos.length > 1 ? "s" : ""}. Marketplaces sell better with 3 or more.` });
  if (!p.stock) out.push({ level: "block", text: "Stock is 0 — nothing to sell." });
  if (!on.length) out.push({ level: "block", text: "Choose at least one channel." });
  if (isFood(p)) {
    if (!s?.fssaiNumber) out.push({ level: "block", text: "FSSAI licence number is missing (needed to sell food on every app)." });
    else {
      const m = monthsUntil(s.fssaiExpiry);
      if (m < 0) out.push({ level: "block", text: "FSSAI licence expiry date is missing or past." });
      else if (m < 6) out.push({ level: "warn", text: "FSSAI licence expires within 6 months — Amazon asks for at least 6 months' validity.", channel: "amazon" });
    }
    if (p.shelfLifeDays < 15 && on.some((l) => CH[l.channel].kind === "quick")) out.push({ level: "warn", text: `Best-before of ${p.shelfLifeDays} days is short for warehouse stocking. Check each quick-delivery app's minimum.` });
  }
  if (!s?.gstin) out.push({ level: "warn", text: "GSTIN is missing. Most apps need GST registration before selling." });
  for (const l of on) {
    const info = CH[l.channel];
    const acc = s?.accounts?.[l.channel] ?? "not_started";
    if ((info.kind === "marketplace" || info.kind === "quick") && acc !== "approved") out.push({ level: info.kind === "quick" ? "block" : "warn", text: `${info.label}: seller account ${acc === "applied" ? "applied, waiting for approval" : "not set up yet"}.`, channel: l.channel });
    const f = profitOn(p, l);
    if (f && f.profit < 0) out.push({ level: "warn", text: `${info.label}: you lose Rs ${Math.abs(Math.round(f.profit))} per unit after fees at this price.`, channel: l.channel });
    if (l.channel === "flipkart" && !p.flipkartFsn) out.push({ level: "warn", text: "Flipkart: add the FSN from Seller Hub so price and stock can be updated automatically.", channel: "flipkart" });
    if (l.channel === "amazon" && !p.amazonProductType) out.push({ level: "warn", text: "Amazon: add the product type (from Seller Central) so the listing can be created automatically.", channel: "amazon" });
  }
  const allocated = on.filter((l) => CH[l.channel].kind === "quick").reduce((a, l) => a + l.stock, 0);
  if (allocated > p.stock) out.push({ level: "block", text: "Stock sent to quick-delivery warehouses is more than the total stock." });
  if (!out.length) out.push({ level: "ok", text: "Everything needed is in place." });
  return out;
}
export const blocking = (c: Check[]) => c.filter((x) => x.level === "block");

/* ---------- Search everywhere: FAQ, structured data, AI summary, scores ---------- */
export function writeFaq(p: LaunchProduct, sellerCity = ""): { q: string; a: string }[] {
  const n = p.name || "this product";
  const where = p.listings.filter((l) => l.enabled && (CH[l.channel].kind === "marketplace" || CH[l.channel].kind === "quick")).map((l) => CH[l.channel].label);
  const faq = [
    p.ingredients && { q: `What is ${n} made of?`, a: sentence(`${p.brand} ${n} is made with ${p.ingredients.replace(/\.$/, "")}`) },
    p.size && { q: `How much ${n} is in one pack?`, a: `Each pack holds ${p.size}.` },
    isFood(p) && p.shelfLifeDays && { q: `How long does ${n} stay fresh?`, a: `Best before ${p.shelfLifeDays} days from the packing date. Store in a cool, dry place${p.category === "sweets" ? " and refrigerate after opening" : ""}.` },
    (p.story || sellerCity) && { q: `Who makes ${p.brand} ${n}?`, a: sentence(p.story || `${p.brand}, ${sellerCity}`) },
    where.length && { q: `Where can I buy ${p.brand} ${n} online?`, a: `On ${where.join(", ")}${p.price ? `, at Rs ${p.price.toLocaleString("en-IN")} for ${p.size}` : ""}.` },
    p.price && p.mrp > p.price && { q: `Is there a discount on ${n}?`, a: `Yes — Rs ${p.price.toLocaleString("en-IN")} against an MRP of Rs ${p.mrp.toLocaleString("en-IN")}.` },
  ].filter(Boolean) as { q: string; a: string }[];
  return faq;
}

export function structuredData(p: LaunchProduct, pageUrl = ""): string {
  const offerUrl = pageUrl || undefined;
  const data = [
    {
      "@context": "https://schema.org", "@type": "Product", name: `${p.brand} ${p.name}`.trim(), sku: p.sku || undefined, brand: { "@type": "Brand", name: p.brand },
      description: descriptionFor(p), size: p.size || undefined, category: FOOD_LABEL[p.category],
      offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: offerUrl },
    },
    p.faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null,
  ].filter(Boolean);
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

/** A short, factual summary for AI engines and shopping agents (llms.txt style). */
export function aiSummary(p: LaunchProduct, sellerCity = ""): string {
  const where = p.listings.filter((l) => l.enabled && CH[l.channel].kind !== "social").map((l) => CH[l.channel].label).filter((x) => x !== "Google & AI search");
  return [
    `# ${p.brand} ${p.name}`.trim(),
    "",
    `> ${descriptionFor(p) || "Product summary"}`,
    "",
    `- Brand: ${p.brand}`,
    sellerCity ? `- Made in: ${sellerCity}` : "",
    `- Pack size: ${p.size}`,
    `- Price: Rs ${p.price} (MRP Rs ${p.mrp || p.price})`,
    `- Availability: ${p.stock > 0 ? "in stock" : "out of stock"}`,
    isFood(p) ? `- Best before: ${p.shelfLifeDays} days from packing` : "",
    p.ingredients ? `- Ingredients: ${clean(p.ingredients)}` : "",
    where.length ? `- Buy on: ${where.join(", ")}` : "",
    "",
    ...p.faq.map((f) => `## ${f.q}\n${f.a}\n`),
  ].filter((l) => l !== "").join("\n");
}

export interface SearchScore { id: "SEO" | "AEO" | "GEO" | "AIO" | "AXO"; plain: string; score: number; todo: string[] }
export function searchScores(p: LaunchProduct): SearchScore[] {
  const g = (ok: boolean, w: number, todo: string, list: string[]) => { if (!ok) list.push(todo); return ok ? w : 0; };
  const mk = (id: SearchScore["id"], plain: string, parts: [boolean, number, string][]) => {
    const todo: string[] = [];
    const total = parts.reduce((a, [, w]) => a + w, 0);
    const got = parts.reduce((a, [ok, w, t]) => a + g(ok, w, t, todo), 0);
    return { id, plain, score: Math.round((got / total) * 100), todo };
  };
  const kw = words(p.keywords);
  const amz = p.listings.find((l) => l.channel === "amazon");
  const desc = descriptionFor(p);
  return [
    mk("SEO", "Rank in Google and marketplace search", [
      [kw.length >= 2, 2, "Add at least 2 search words buyers use (e.g. \"cashew sweet\", \"diwali gift\")."],
      [!!amz && kw.some((k) => amz.title.toLowerCase().includes(k.toLowerCase())), 2, "Put a main search word in the title."],
      [/\d/.test(p.size), 1, "Show the pack size (e.g. 250 g) in the title."],
      [desc.length >= 200, 2, "Write a longer story/description (200+ characters)."],
      [p.photos.length >= 3, 2, "Add 3 or more photos."],
    ]),
    mk("AEO", "Be the direct answer to buyers' questions", [
      [p.faq.length >= 4, 3, "Have at least 4 questions and answers (press \"Write FAQ\")."],
      [p.faq.every((f) => f.a.length <= 220), 1, "Keep each answer short (under 2 sentences)."],
      [!!p.ingredients, 1, "Fill in ingredients — the most asked question for food."],
    ]),
    mk("GEO", "Be named by ChatGPT, Gemini and Perplexity", [
      [!!p.story, 2, "Add who makes it and what makes it different — AI engines quote this."],
      [!!p.brand, 1, "Use one brand name everywhere."],
      [p.listings.filter((l) => l.enabled && CH[l.channel].kind !== "social").length >= 3, 2, "Sell on 3+ trusted sites so AI engines find it in more places."],
      [p.faq.length >= 3, 1, "Publish the FAQ on the seller's page."],
    ]),
    mk("AIO", "Show in Google's AI Overviews", [
      [p.price > 0 && !!p.brand, 1, "Price and brand must be set for product data."],
      [p.photos.length > 0, 1, "Add a product photo for Google's product data."],
      [p.faq.length >= 3, 1, "Add FAQ structured data."],
      [p.listings.some((l) => l.channel === "google" && l.enabled), 2, "Turn on the Google & AI search channel (Merchant Center feed)."],
    ]),
    mk("AXO", "Readable by AI shopping agents", [
      [!!p.sku, 1, "Set a SKU code."],
      [p.stock > 0, 1, "Keep stock above 0 so agents see it as available."],
      [p.price > 0 && p.mrp > 0, 1, "Set both price and MRP."],
      [isFood(p) ? p.shelfLifeDays > 0 : true, 1, "Set the best-before days."],
      [p.faq.length > 0, 1, "Publish the AI summary (llms.txt) on the seller's site."],
    ]),
  ];
}

/* ---------- Ads ---------- */
export const AD_LABEL: Record<keyof AdPlan["split"], string> = { meta: "Meta (Facebook + Instagram)", amazon_ads: "Amazon Sponsored Products", flipkart_ads: "Flipkart Ads" };
export function adAmounts(a: AdPlan) {
  const sum = Object.values(a.split).reduce((x, y) => x + y, 0) || 1;
  return (Object.keys(a.split) as (keyof AdPlan["split"])[]).map((k) => ({ key: k, label: AD_LABEL[k], perDay: Math.round((a.dailyBudget * a.split[k]) / sum) }));
}

/* ---------- Small helpers ---------- */
export const enabledChannels = (p: LaunchProduct) => p.listings.filter((l) => l.enabled).map((l) => l.channel);
export const marketplaceNames = (p: LaunchProduct) => p.listings.filter((l) => l.enabled && (CH[l.channel].kind === "marketplace" || CH[l.channel].kind === "quick")).map((l) => CH[l.channel].label);
