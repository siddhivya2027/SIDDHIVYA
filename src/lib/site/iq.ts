/**
 * Siddhi — the SIDDHIVYA website assistant (code name IQ). Runs entirely in the browser: no paid AI key, nothing sent anywhere
 * except an enquiry the visitor chooses to submit. It understands intents by keywords, pulls numbers out
 * of the message (price, weight, sellers), and can calculate fees, explain seller plans, check a product title
 * and collect an enquiry step by step. Answers only from facts in this codebase — never invents prices.
 */
import { hasEmail, SITE } from "@/config/site";
import { calculate, FEE_CONFIGS, type CalcId } from "./fees";
import { checkListing, type Marketplace } from "./listing-check";
import { SERVICES } from "./leads";
import { ADD_ONS, planPrice, SELLER_PLANS, SHOW_PRICES } from "./pricing";

export type Action = { label: string; href: string; external?: boolean };
export interface IQMessage { from: "iq" | "you"; text: string; chips?: string[]; actions?: Action[]; ts: number }
export type Stage = "idle" | "lead_name" | "lead_phone" | "lead_email" | "lead_need";
export interface IQState { stage: Stage; lead: { name?: string; phone?: string; email?: string; interest?: string }; lastCalc?: CalcId }
export interface IQTurn { messages: Omit<IQMessage, "ts">[]; state: IQState; submit?: { name: string; phone: string; email: string; interest: (typeof SERVICES)[number] } }

export const IQ_START: IQState = { stage: "idle", lead: {} };
export const MAIN_CHIPS = ["What do you do?", "Amazon fee for ₹999", "Your plans and prices", "Check my product title", "Talk to a person"];
export const GREETING: Omit<IQMessage, "ts"> = {
  from: "iq",
  text: `Hi, I'm **Siddhi**, ${SITE.company}'s assistant. I can explain how we grow sellers, show our plans, work out marketplace fees, check a product title, or get you a call back. What would you like?`,
  chips: MAIN_CHIPS,
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const money = (n: number, id: CalcId) => (FEE_CONFIGS[id].currency === "USD" ? `$${n.toFixed(2)}` : inr(n));
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
const has = (t: string, ...words: string[]) => words.some((w) => (w.includes(" ") ? t.includes(w) : new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(t)));

const MARKET_WORDS: [CalcId, string[]][] = [
  ["amazon", ["amazon"]], ["flipkart", ["flipkart"]], ["meesho", ["meesho"]], ["jiomart", ["jiomart", "jio mart"]],
  ["ebay", ["ebay"]], ["etsy", ["etsy"]], ["blinkit", ["blinkit"]], ["zepto", ["zepto"]], ["instamart", ["instamart", "swiggy"]],
];
export function findMarket(t: string): CalcId | undefined { return MARKET_WORDS.find(([, ws]) => ws.some((w) => t.includes(w)))?.[0]; }

export function findPrice(t: string): number | undefined {
  const m = t.match(/(?:₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d+)?)/) ?? t.match(/(?:price|for|at|of|sell(?:ing)?(?: at)?)\s+([\d,]+(?:\.\d+)?)(?!\s*(?:g|gm|grams?|kg|sellers?|accounts?|brands?))/) ?? t.match(/^([\d,]+(?:\.\d+)?)(?!\s*(?:g|gm|grams?|kg|sellers?|accounts?|brands?))(?:\s|$)/);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}
export function findWeight(t: string): number | undefined {
  const m = t.match(/([\d.]+)\s*(kg|kgs|g|gm|gms|grams?)\b/);
  if (!m) return undefined;
  return /kg/.test(m[2]) ? Math.round(Number(m[1]) * 1000) : Math.round(Number(m[1]));
}
function findCategory(id: CalcId, t: string): string {
  const cats = FEE_CONFIGS[id].categories;
  const map: [string, string[]][] = [["fashion", ["fashion", "saree", "kurta", "dress", "shirt", "clothing", "apparel", "footwear", "shoe"]], ["home", ["home", "kitchen", "decor"]], ["beauty", ["beauty", "cosmetic", "skin", "hair"]], ["electronics", ["electronic", "mobile", "charger", "cable", "earphone"]], ["grocery", ["grocery", "food", "snack", "masala"]], ["books", ["book"]], ["sports", ["sport", "fitness", "gym"]], ["care", ["personal care"]]];
  for (const [cid, ws] of map) if (ws.some((w) => t.includes(w)) && cats.some((c) => c.id === cid)) return cid;
  return cats[0].id;
}

function feeAnswer(id: CalcId, price: number, t: string): Omit<IQMessage, "ts"> {
  const cfg = FEE_CONFIGS[id];
  const categoryId = findCategory(id, t);
  const weight = findWeight(t) ?? 500;
  const r = calculate(cfg, { price, cost: 0, categoryId, weightGrams: weight, zone: "national" });
  const cat = cfg.categories.find((c) => c.id === categoryId)!;
  const lines = r.lines.filter((l) => l.amount > 0).map((l) => `• ${l.label}: ${money(l.amount, id)}`);
  if (!lines.length) lines.push("• No marketplace fees at this price — only any shipping or returns you bear.");
  if (cfg.gstOnFees && r.gstOnFees > 0) lines.push(`• GST 18% on fees: ${money(r.gstOnFees, id)}`);
  return {
    from: "iq",
    text: [
      `**${cfg.name}**, ${money(price, id)}${cfg.categories.length > 1 ? `, ${cat.label.toLowerCase()}` : ""}${cfg.shipping && cfg.shipping !== "manual" ? `, ${weight} g, national delivery` : ""}:`,
      ...lines,
      `**Total taken: ${money(r.totalDeductions, id)}** · reaches your bank: **${money(r.payout, id)}**${r.zeroApplied ? " (zero commission applies)" : ""}.`,
      "These use default public rates checked Nov 2026. Add your product cost in the full calculator to see profit.",
    ].join("\n"),
    actions: [{ label: `Open ${cfg.name} calculator`, href: `#calc-${id}` }],
    chips: ["Try another price", "Flipkart fee for ₹999", "Talk to a person"],
  };
}

function titleCheck(title: string, mk: Marketplace): Omit<IQMessage, "ts"> {
  const rep = checkListing({ marketplace: mk, title, bullets: "", description: "", imageCount: 0, whiteMainImage: true });
  const titleIds = ["title-length", "promo", "format", "stuffing", "specifics"];
  const res = rep.results.filter((r) => titleIds.includes(r.id));
  const total = res.reduce((a, r) => a + r.weight, 0);
  const got = res.reduce((a, r) => a + (r.severity === "pass" ? r.weight : r.severity === "warn" ? r.weight / 2 : 0), 0);
  const score = Math.round((got / total) * 100);
  const issues = res.filter((r) => r.severity !== "pass");
  return {
    from: "iq",
    text: [
      `Title score: **${score}/100** for ${mk[0].toUpperCase() + mk.slice(1)}.`,
      ...(issues.length ? issues.map((r) => `• ${r.label}: ${r.detail}${r.fix ? ` Fix: ${r.fix}` : ""}`) : ["• Clean, the right length, with a key detail. Nice."]),
      "For the full check (points, description, images) and the **Fix it to 100%** button, open the listing checker.",
    ].join("\n"),
    actions: [{ label: "Open listing checker", href: "#listing-check" }],
    chips: ["Check another title", "Talk to a person"],
  };
}

const SERVICE_ANSWERS: [string[], string][] = [
  [["manage", "management", "run my", "account management", "seller central"], "We run your **marketplace shops** day to day — listings, prices, offers, stock and ads — on Amazon, Flipkart, Myntra and Meesho. Your account stays in your name; you add us as a user."],
  [["listing", "catalogue", "catalog", "title", "bullet", "description"], "We fix your **listings** to each marketplace's rules — titles, bullet points, descriptions and images — so buyers find you and buy. Try the free listing check on this page first."],
  [["ads", "advertis", "sponsored", "ppc", "campaign", "meta ads", "facebook ads", "instagram ads"], "We run **marketplace ads** (Amazon and Flipkart) and **Meta ads** (Facebook, Instagram, WhatsApp), planned around profit. You see the ad return for every ₹100 spent on your dashboard."],
  [["photo", "video", "creative", "banner", "design", "reel", "shoot"], "Our studio makes **product photos, banners and short videos** in one look for your brand, and posts them to Facebook and Instagram after you approve."],
  [["social", "instagram", "facebook", "post", "posting", "whatsapp status"], "We plan and post your **social media** — posts, reels and stories on Facebook and Instagram — and send offers to your buyers on WhatsApp."],
  [["seo", "google", "rank", "search", "chatgpt", "gemini", "ai search"], "Our **Search everywhere** work helps buyers find you on Google, inside marketplace search and in AI answers like ChatGPT and Gemini. No one can promise a rank, but we measure and improve it every month."],
  [["new seller", "register", "registration", "open account", "start selling", "gst", "onboard"], "New to selling? We help with **marketplace registration**, documents and your first catalogue upload. Amazon usually asks for PAN, GSTIN, bank details and an address."],
  [["dashboard", "login", "report", "track", "see results"], "Every seller gets their own **dashboard login**: sales, orders, ad spend, ad return and stock for each marketplace, creatives waiting for approval, and monthly reports. The preview on this site uses sample data."],
];

function plansAnswer(): Omit<IQMessage, "ts"> {
  return {
    from: "iq",
    text: [
      "**Our monthly plans:**",
      ...SELLER_PLANS.map((p) => `• **${p.name}** (${p.forWho.toLowerCase()}): ${planPrice(p)}${SHOW_PRICES ? "/month + GST" : ""} — ${p.features.slice(0, 2).join(", ").toLowerCase()}`),
      `Add-ons: ${ADD_ONS.slice(0, 2).map(([a, b]) => `${a.toLowerCase()} (${b})`).join("; ")}.`,
      "Ad money is paid by you directly to the marketplace or Meta.",
    ].join("\n"),
    actions: [{ label: "See plans", href: "#pricing" }],
    chips: ["Talk to a person", "What do you do?"],
  };
}

/** One conversational turn. Pure function — easy to test. */
export function iqReply(state: IQState, raw: string): IQTurn {
  const text = raw.trim();
  const t = norm(text);
  const s: IQState = { ...state, lead: { ...state.lead } };
  const say = (m: Omit<IQMessage, "ts" | "from">): IQTurn => ({ messages: [{ from: "iq", ...m }], state: s });

  if (has(t, "cancel", "stop", "never mind", "nevermind") && s.stage !== "idle") { s.stage = "idle"; return say({ text: "No problem — cancelled. Anything else?", chips: MAIN_CHIPS }); }

  // ---- Enquiry collection ----
  if (s.stage === "lead_name") {
    if (text.length < 2) return say({ text: "What name should we use?" });
    s.lead.name = text.replace(/^(my name is|i am|im|this is)\s+/i, "").slice(0, 60); s.stage = "lead_phone";
    return say({ text: `Thanks, ${s.lead.name.split(" ")[0]}. Your phone or WhatsApp number?` });
  }
  if (s.stage === "lead_phone") {
    const ph = text.replace(/[^\d+]/g, "");
    if (ph.replace(/\D/g, "").length < 10) return say({ text: "That doesn't look like a full number — please send it with at least 10 digits." });
    s.lead.phone = text.trim(); s.stage = "lead_email";
    return say({ text: "And your email?" });
  }
  if (s.stage === "lead_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return say({ text: "Please send a valid email address, like name@business.com." });
    s.lead.email = text; s.stage = "lead_need";
    return say({ text: "Last one — what do you need help with?", chips: [...SERVICES] });
  }
  if (s.stage === "lead_need") {
    const interest = SERVICES.find((x) => norm(x) === t) ?? SERVICES.find((x) => t && norm(x).includes(t)) ?? "Something else";
    s.stage = "idle";
    const lead = { name: s.lead.name!, phone: s.lead.phone!, email: s.lead.email!, interest };
    s.lead = {};
    return { messages: [{ from: "iq", text: "Sending your details to the team…" }], state: s, submit: lead };
  }

  // ---- Intents ----
  if (/^(hi|hello|hey|hai|vanakkam|good (morning|afternoon|evening))\b/.test(t)) return say({ text: "Hello! How can I help today?", chips: MAIN_CHIPS });
  if (has(t, "thank", "thanks", "thx", "great", "awesome", "super")) return say({ text: "Happy to help! Anything else?", chips: MAIN_CHIPS });
  if (has(t, "person", "human", "call me", "callback", "call back", "talk to", "contact", "enquiry", "consultation", "quote", "proposal", "hire")) {
    s.stage = "lead_name";
    return say({ text: "I'll get a person from our team to call you. What's your name? (Type *cancel* any time.)", actions: [{ label: "WhatsApp us now", href: `https://wa.me/${SITE.contact.whatsapp}`, external: true }, { label: `Call ${SITE.contact.phones[0]}`, href: `tel:${SITE.contact.phones[0].replace(/[^+\d]/g, "")}` }] });
  }
  if (has(t, "phone", "number", "email", "mail", "whatsapp", "reach")) {
    return say({ text: `You can reach us at:\n• Phone: ${SITE.contact.phones.join(" / ")}\n• WhatsApp: ${SITE.contact.phones[0]}${hasEmail() ? `\n• Email: ${SITE.contact.email}` : ""}`, actions: [{ label: "WhatsApp", href: `https://wa.me/${SITE.contact.whatsapp}`, external: true }, ...(hasEmail() ? [{ label: "Email", href: `mailto:${SITE.contact.email}` }] : [])] });
  }
  if (has(t, "where", "location", "address", "office", "chennai")) return say({ text: `We're based in ${SITE.location.address || SITE.location.city} and work with sellers across India — online, or in person in Tamil Nadu.` });

  // Title check: "check: <title>" or a pasted long line after asking
  const titleMatch = text.match(/^(?:check|title|listing)\s*[:\-]\s*(.{10,})$/i);
  if (titleMatch) return say(titleCheck(titleMatch[1], (findMarket(norm(titleMatch[1])) as Marketplace) ?? "amazon"));
  if (has(t, "check my product title", "check another title", "listing check", "check my listing", "check title")) {
    return say({ text: "Paste your title like this:\n**check: Cotton Kurta for Men, Regular Fit, Navy Blue, Size M**\nI'll score it for Amazon (add *flipkart* or *myntra* to check for those)." });
  }

  // Fee calculation
  const market = findMarket(t);
  const price = findPrice(t);
  if (market && (has(t, "fee", "fees", "commission", "charges", "calculator", "calculate", "how much") || price !== undefined)) {
    s.lastCalc = market;
    if (price === undefined) return say({ text: `Sure — what's your selling price on ${FEE_CONFIGS[market].name}? (e.g. *${FEE_CONFIGS[market].currency === "USD" ? "$40" : "₹999"}*). You can add the category and weight too, like *₹999 saree 600 g*.` });
    return say(feeAnswer(market, price, t));
  }
  if (s.lastCalc && price !== undefined && !has(t, "plan", "plans")) return say(feeAnswer(s.lastCalc, price, t));
  if (has(t, "try another price")) return say({ text: `Send the new price${s.lastCalc ? ` for ${FEE_CONFIGS[s.lastCalc].name}` : " and marketplace"}, e.g. *₹1499*.` });
  if (has(t, "fee", "fees", "commission", "calculator")) return say({ text: "Which marketplace? I can do Amazon, Flipkart, Meesho, JioMart, eBay, Etsy, Blinkit, Zepto and Swiggy Instamart.", chips: ["Amazon fee for ₹999", "Flipkart fee for ₹999", "Meesho fee for ₹399", "Blinkit fee for ₹199"] });

  // Plans and prices
  if (has(t, "plan", "plans", "price", "prices", "pricing", "cost", "how much", "budget", "charges", "package", "packages")) return say(plansAnswer());

  for (const [words, answer] of SERVICE_ANSWERS) if (has(t, ...words)) return say({ text: answer, chips: ["Talk to a person", "Your plans and prices", "What do you do?"] });

  if (has(t, "what do you do", "services", "service", "offer", "help with")) {
    return say({ text: `${SITE.company} grows online sellers:\n• Marketplace shop management\n• Listings that sell\n• Amazon, Flipkart and Meta ads\n• Product photos and videos\n• Facebook and Instagram posting\n• Search everywhere (Google and AI answers)\n• New seller set-up\n• Your own seller dashboard and reports\nWhich one interests you?`, chips: ["Listings", "Ads", "Photos and videos", "Your plans and prices", "Talk to a person"] });
  }
  if (has(t, "work", "portfolio", "clients", "projects", "examples", "results")) {
    return SITE.portfolio.length
      ? say({ text: `Some sellers we've helped:\n${SITE.portfolio.map((p) => `• **${p.name}** (${p.place}) — ${p.work}`).join("\n")}`, actions: [{ label: "See stories", href: "#work" }] })
      : say({ text: "We're a new agency, so we'd rather show you than tell you: book a free growth call and we'll look at your shop and show you the three changes that would help most.", chips: ["Talk to a person"] });
  }
  if (has(t, "how long", "timeline", "time take", "days", "weeks")) return say({ text: "Listing fixes often show within 2–4 weeks; ads start bringing orders as soon as they go live. You get a written plan with dates before any work starts.", chips: ["Talk to a person"] });
  if (has(t, "refund", "cancel")) return say({ text: "Our refund & cancellation policy is here.", actions: [{ label: "Refund policy", href: "/refund-policy" }] });
  if (has(t, "privacy", "data")) return say({ text: "We only use what you send us to reply to you; full details are in our privacy policy.", actions: [{ label: "Privacy policy", href: "/privacy" }] });
  if (has(t, "who are you", "are you human", "are you a bot", "your name")) return say({ text: `I'm **Siddhi**, ${SITE.company}'s automated assistant. I answer instantly from what's on this site — for anything else, I can get a person to call you.`, chips: ["Talk to a person"] });

  return say({ text: "I'm not sure I got that. I can help with our services, plans and prices, marketplace fees, checking a product title, or getting a person to call you.", chips: MAIN_CHIPS });
}
