/**
 * MANUAL BACKUP — pure functions, no I/O.
 * When automation is not enough (an API is down, an app has no API, or buyers simply are not coming),
 * the team works by hand. This file gives them everything ready: the local keyword pack, the exact
 * Amazon "search terms" box text, ad keywords, and a tick-off playbook with copy-paste messages.
 */
import { CH } from "./channels";
import { FOOD_LABEL } from "./engine";
import type { LaunchProduct } from "./types";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
export const splitWords = (s = "") => s.split(/[,;\n]/).map(clean).filter(Boolean);
const uniq = (a: string[]) => { const seen = new Set<string>(); return a.filter((x) => { const k = x.toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; }); };
const bytes = (s: string) => new TextEncoder().encode(s).length;
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;

/** Amazon's "Search terms" (generic keywords) box: under 250 bytes, no brand, no words already in the title. */
export const AMAZON_BACKEND_MAX = 249;
export function fitBytes(words: string[], max = AMAZON_BACKEND_MAX): string {
  let out = "";
  for (const w of words) { const next = out ? `${out} ${w}` : w; if (bytes(next) > max) continue; out = next; }
  return out;
}

const shopWord = (p: LaunchProduct) => (p.category === "sweets" ? "sweet shop" : FOOD_LABEL[p.category].toLowerCase());

export interface KeywordPack {
  main: string[]; // the seller's own search words
  areas: string[]; // town first, then nearby places
  localNames: string[]; // other names, local language
  local: string[]; // ready local searches: "kaju katli vijayawada", "kaju katli near me"…
  amazonBackend: string; // paste into Amazon → Edit listing → Keywords → Search terms
  adKeywords: string[]; // Amazon Sponsored Products (manual targeting), Flipkart Ads, Google Ads
  negative: string[]; // words to block in ads
  hashtags: string;
  aiQuestions: string[]; // ask ChatGPT / Gemini / Perplexity by hand to see if the seller shows up
  manual: { amazonBackend: boolean; adKeywords: boolean; negative: boolean; hashtags: boolean };
}

export function keywordPack(p: LaunchProduct, city = ""): KeywordPack {
  const name = clean(p.name).toLowerCase();
  const main = splitWords(p.keywords);
  const areas = uniq([...splitWords(p.areas), ...(city ? [clean(city)] : [])]).slice(0, 6);
  const localNames = splitWords(p.localNames);
  const local = name ? uniq([
    ...areas.slice(0, 4).flatMap((a) => [`${name} ${a.toLowerCase()}`, `${name} in ${a.toLowerCase()}`, `best ${shopWord(p)} in ${a.toLowerCase()}`, `${name} home delivery ${a.toLowerCase()}`]),
    `${name} near me`, `buy ${name} online`,
    ...localNames.map((l) => l.toLowerCase()),
  ]) : [];
  const m = p.manualSearch ?? {};

  // Amazon search terms: single words not in the title and not the brand.
  const title = (p.listings.find((l) => l.channel === "amazon")?.title ?? `${p.brand} ${p.name}`).toLowerCase();
  const brand = clean(p.brand).toLowerCase().split(" ");
  const autoBackend = fitBytes(uniq([...main, ...localNames, ...areas, "gift", "festival", "fresh", "pack"]
    .flatMap((w) => w.toLowerCase().split(/\s+/))
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => w.length > 1 && !title.includes(w) && !brand.includes(w))));
  const amazonBackend = m.amazonBackend?.trim() ? fitBytes(clean(m.amazonBackend).split(" ")) : autoBackend;

  const adAuto = name ? uniq([name, `${name} ${clean(p.size).toLowerCase()}`, `buy ${name} online`, ...main.map((w) => w.toLowerCase()), ...local.slice(0, 12)]).slice(0, 30) : [];
  const adKeywords = m.adKeywords?.trim() ? uniq(splitWords(m.adKeywords)) : adAuto;
  const negative = m.negativeKeywords?.trim() ? uniq(splitWords(m.negativeKeywords)) : ["recipe", "how to make", "free", "job", "wholesale price list", "near me open now"].slice(0, p.category === "non_food" ? 4 : 6);
  const tagWords = [p.brand, p.name, ...main.slice(0, 4), ...areas.slice(0, 2).map((a) => `${a} ${p.category === "sweets" ? "sweets" : "food"}`)];
  const autoTags = uniq(tagWords.map((w) => "#" + w.replace(/[^\p{L}\p{N}]/gu, "")).filter((t) => t.length > 2)).slice(0, 10).join(" ");
  const hashtags = m.hashtags?.trim() ? clean(m.hashtags) : autoTags;
  const aiQuestions = name ? uniq([
    ...areas.slice(0, 2).map((a) => `Best ${name} in ${a}?`),
    `Where can I buy ${p.brand} ${name} online?`,
    `Which brand of ${name} is good to buy online in India?`,
  ]) : [];
  return { main, areas, localNames, local, amazonBackend, adKeywords, negative, hashtags, aiQuestions, manual: { amazonBackend: !!m.amazonBackend?.trim(), adKeywords: !!m.adKeywords?.trim(), negative: !!m.negativeKeywords?.trim(), hashtags: !!m.hashtags?.trim() } };
}

/* ---------- Are customers coming? ---------- */
export type Verdict = "not_live" | "too_early" | "slow" | "ok";
export interface Health { daysLive: number; orders7: number; units7: number; verdict: Verdict; text: string }
const DAY = 86400000;

export function salesHealth(p: Pick<LaunchProduct, "liveSince">, orders: { ts: number; qty: number }[], now = Date.now()): Health {
  if (!p.liveSince) return { daysLive: 0, orders7: 0, units7: 0, verdict: "not_live", text: "Not live anywhere yet. Send it live first, by one click or by hand." };
  const daysLive = Math.floor((now - p.liveSince) / DAY);
  const recent = orders.filter((o) => o.ts >= now - 7 * DAY && o.ts <= now);
  const orders7 = recent.length, units7 = recent.reduce((a, o) => a + o.qty, 0);
  if (daysLive < 3) return { daysLive, orders7, units7, verdict: "too_early", text: `Live for ${daysLive} day${daysLive === 1 ? "" : "s"}. Apps take 2–3 days to start showing a new product. Start the "Get found nearby" steps now anyway.` };
  if (orders7 < 3) return { daysLive, orders7, units7, verdict: "slow", text: `Customers are not coming: only ${orders7} order${orders7 === 1 ? "" : "s"} in the last 7 days. Work through the steps below by hand, starting from the top.` };
  return { daysLive, orders7, units7, verdict: "ok", text: `${orders7} orders in the last 7 days. Keep the daily steps going (story, reviews, WhatsApp).` };
}

/* ---------- The manual playbook ---------- */
export type TaskGroup = "Get found nearby" | "Talk to people directly" | "In the town (offline)" | "Marketplaces by hand" | "AI & Google by hand";
export const GROUPS: TaskGroup[] = ["Get found nearby", "Talk to people directly", "In the town (offline)", "Marketplaces by hand", "AI & Google by hand"];
export interface Task { id: string; group: TaskGroup; title: string; why: string; steps: string[]; copy?: string; link?: { label: string; href: string }; daily?: boolean }
export interface PlaybookCtx { sellerName: string; city: string; phone?: string; where: string[]; orderLink?: string }

export function playbookTasks(p: LaunchProduct, ctx: PlaybookCtx): Task[] {
  const k = keywordPack(p, ctx.city);
  const town = k.areas[0] || ctx.city || "your town";
  const product = `${p.brand} ${p.name}`.trim() || "this product";
  const price = p.price ? rs(p.price) : "";
  const shops = ctx.where.length ? ctx.where.join(", ") : "our shop";
  const link = ctx.orderLink || (ctx.phone ? `https://wa.me/${ctx.phone}` : "");
  const call = ctx.phone ? `WhatsApp/call: +${ctx.phone}` : "";
  const offer = p.mrp > p.price && p.price ? `${Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off — ${price} (MRP ${rs(p.mrp)})` : price;
  const t: Task[] = [
    {
      id: "gbp", group: "Get found nearby", title: "Google Business Profile: add the product and post", daily: false,
      why: `Most people in ${town} search on Google Maps first. A free business profile with this product shows up for "${k.local[0] ?? `${p.name} near me`}".`,
      steps: ["Open business.google.com with the seller's Gmail.", `Check the shop name, address in ${town}, phone and timings are right (verify if asked).`, "Products → Add product → photo, name, price, link.", "Add update (post) → paste the text below → add the post photo → Publish.", "Repeat the post once a week."],
      copy: `${product} (${p.size}) — fresh from ${ctx.sellerName}, ${town}.\n${offer}\nOrder on ${shops}.${link ? `\nOrder link: ${link}` : ""}`,
      link: { label: "Open Google Business", href: "https://business.google.com/" },
    },
    {
      id: "reviews", group: "Get found nearby", title: "Ask 5 happy customers for a Google review", daily: false,
      why: "Reviews decide who shows first on Maps. 5 real reviews in the first month make a big difference.",
      steps: ["Google Business → Ask for reviews → copy the review link.", "Send the message below to 5–10 regular customers on WhatsApp.", "Reply 'thank you' to every review within a day."],
      copy: `Namaste! Thank you for buying ${product} from ${ctx.sellerName}. If you liked it, please give us a quick Google review — it helps a small shop like ours a lot 🙏\n<paste your review link here>`,
    },
    {
      id: "listings-free", group: "Get found nearby", title: "Free local listings: Justdial, IndiaMART, Facebook Page",
      why: "More places that mention the shop and town = more ways to be found, and AI engines read these too.",
      steps: ["Justdial → Free listing → same name, address, phone as Google.", "IndiaMART (for bulk/gift orders) → add the product with price.", "Facebook Page → About → add town, phone, WhatsApp button."],
      copy: `${ctx.sellerName}, ${town}. ${product} ${p.size}. ${offer}. ${call}`.trim(),
    },
    {
      id: "wa-broadcast", group: "Talk to people directly", title: "WhatsApp broadcast to the seller's own contacts", daily: true,
      why: "The seller's existing customers are the fastest first buyers — no ad money needed.",
      steps: ["WhatsApp Business → Broadcast lists → New list → add customers who saved the number.", "Send the message below with the post image.", "Only message people who know the shop; once or twice a week at most."],
      copy: `🙏 Namaste from ${ctx.sellerName}!\n${product} (${p.size}) is now available online — ${offer}.\nOrder on ${shops}${link ? ` or here: ${link}` : ""}.\nReply STOP if you don't want these messages.`,
    },
    {
      id: "groups", group: "Talk to people directly", title: `Post in ${town} WhatsApp and Facebook groups`, daily: false,
      why: "Local groups (apartments, community, buy-sell) reach hundreds of nearby families for free.",
      steps: [`Find 5 active groups for ${town} (apartment, community, "${town} buy and sell").`, "Read each group's rules; post only where selling is allowed.", "Post the text and photo below; answer questions quickly."],
      copy: `Homemade-quality ${p.name} from ${ctx.sellerName}, ${town} 😋\n${p.size} — ${offer}\nAvailable on ${shops}.${call ? `\n${call}` : ""}`,
    },
    {
      id: "insta-daily", group: "Talk to people directly", title: "Instagram / Facebook story or reel every day, with location", daily: true,
      why: `Location tags and local hashtags show the post to people in ${town}. Daily posting keeps the shop in their mind.`,
      steps: ["Film 10–15 seconds: making, packing, or a customer tasting.", `Add location sticker: ${town}.`, "Paste the caption and hashtags below.", "Use Reel maker in SIDDHIVYA if you need a quick video."],
      copy: `${product} ✨ ${offer}\nOrder on ${shops}.\n${k.hashtags}`,
    },
    {
      id: "fb-marketplace", group: "Talk to people directly", title: "Facebook Marketplace listing in the town",
      why: "Marketplace is searched by local buyers and is free.",
      steps: ["Facebook → Marketplace → Create new listing → Item for sale.", "Photos, price, the text below, location: the shop's area.", "Renew the listing every 7 days."],
      copy: `${product} ${p.size}\n${offer}\nFresh stock from ${ctx.sellerName}, ${town}. Also on ${shops}.`,
    },
    {
      id: "shops-tieup", group: "In the town (offline)", title: "Tie up with 3 nearby shops (bakery, kirana, temple stall)",
      why: "Shops with walk-in customers can sell on commission; also a showcase for festival/gift orders.",
      steps: ["List 5 shops with good walk-in within 3 km.", "Visit with a sample box; show the price and the shop's margin.", "Leave 5–10 packs on sale-or-return; check every week."],
      copy: `Namaste, I am from ${ctx.sellerName}, ${town}. We make ${product} (${p.size}, MRP ${rs(p.mrp || p.price)}). We can give you a margin per pack and take back unsold stock. Can we keep a few packs at your counter?`,
    },
    {
      id: "pamphlet", group: "In the town (offline)", title: "Print a small card with the order link / WhatsApp",
      why: "Every box that leaves the shop should bring the next order. A card in the box and at the counter does this.",
      steps: ["Print the text below on A6 cards (any print shop, ~Rs 1–2 each).", "Put one in every box and keep a stack at the counter.", "Add a QR of the order link (any free QR maker)."],
      copy: `${ctx.sellerName} — ${town}\n${product}\nNow order online: ${shops}${link ? `\n${link}` : ""}${call ? `\n${call}` : ""}\nFestival & gift orders welcome.`,
    },
    {
      id: "amz-terms", group: "Marketplaces by hand", title: "Amazon: paste the search terms (backend keywords)",
      why: "Amazon only shows a product for words it knows. This box adds local names and town words without changing the title.",
      steps: ["Seller Central → Inventory → Manage All Inventory → Edit the product.", "Keywords tab → Search terms → paste the line below (already under Amazon's 250-byte limit).", "Save. It can take up to 24 hours to work."],
      copy: k.amazonBackend,
      link: { label: "Open Seller Central", href: "https://sellercentral.amazon.in/" },
    },
    {
      id: "amz-ads", group: "Marketplaces by hand", title: "Amazon / Flipkart ads with your own keywords (manual targeting)",
      why: "If automatic ads waste money or don't show, manual keywords put the ad exactly on the searches you choose.",
      steps: ["Amazon Advertising → Sponsored Products → Manual targeting → Keyword targeting.", "Paste the keywords below (one per line) — start with Phrase match, bid Rs 3–5.", "Paste the negative keywords under Negative keyword targeting.", "After 7 days: pause keywords with clicks but no orders. Flipkart Ads: same list."],
      copy: `KEYWORDS:\n${k.adKeywords.join("\n")}\n\nNEGATIVE:\n${k.negative.join("\n")}`,
      link: { label: "Open Amazon Ads", href: "https://advertising.amazon.in/" },
    },
    {
      id: "price-check", group: "Marketplaces by hand", title: "Check price and photos against 3 competitors",
      why: "If similar products are cheaper or look better, buyers skip ours even when they see it.",
      steps: [`Search "${p.name} ${p.size}" on Amazon, Flipkart and Blinkit.`, "Note the 3 nearest sellers' price per 100 g and photo quality.", "If ours costs more, show why (fresh, pure ghee, local) in photo 2 — or try a smaller pack/combo.", "Write what you found in the note box."],
    },
    {
      id: "offer", group: "Marketplaces by hand", title: "Run a short offer or festival combo",
      why: "A clear time-limited reason to buy now gets the first orders and the first reviews.",
      steps: ["Amazon: Advertising → Coupons (5–10%). Flipkart: Promotions. Meesho: set a lower price for 7 days.", "Combine 2 products as a gift box for festivals (Sankranti, Diwali, Rakhi).", "Share the offer with the WhatsApp text below."],
      copy: `🎉 This week only: ${product} ${offer}. Perfect for gifting. Order on ${shops}${link ? `: ${link}` : ""}`,
    },
    {
      id: "ai-check", group: "AI & Google by hand", title: "Ask ChatGPT, Gemini and Perplexity — note if the shop appears", daily: false,
      why: "This is how you check GEO / AIO by hand. If the shop isn't named, the steps below fix the reasons.",
      steps: ["Ask each question below in ChatGPT, Gemini, Perplexity and Google.", "On Search Everywhere → 'Are we being found?', record whether the shop was named.", "Check again every 2 weeks."],
      copy: k.aiQuestions.join("\n"),
    },
    {
      id: "faq-publish", group: "AI & Google by hand", title: "Publish the FAQ and product story where Google and AI can read it",
      why: "AI engines quote pages that answer questions clearly. Put the FAQ on the seller's Facebook Page, Instagram highlight and website.",
      steps: ["Search Everywhere → copy the FAQ and AI summary for this product.", "Facebook Page → post it; Instagram → a carousel + highlight 'FAQ'.", "If the seller has a website: paste the structured data and add llms.txt."],
      copy: p.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n") || "Press 'Write FAQ' on the product first.",
    },
    {
      id: "local-words", group: "AI & Google by hand", title: "Use the local search words everywhere you write",
      why: "People search in their own words and language. Using these words in posts, Google profile and listings makes the shop match.",
      steps: ["Use 2–3 of these words in every post and in the Google Business description.", "Add any word customers actually say to 'Local names' on the product."],
      copy: [...k.local, ...k.localNames].join("\n") || "Add the town and local names on the product (Manual keywords).",
    },
  ];
  return t;
}

/** Channels that have no seller API: always done by hand (upload sheet) or by a person. */
export const ALWAYS_MANUAL = (Object.keys(CH) as (keyof typeof CH)[]).filter((id) => CH[id].kind === "quick" || id === "meesho");
