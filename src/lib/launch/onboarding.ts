/**
 * SELLER ONBOARDING CHECKLIST — one list used by both the public website and the software.
 * Rule behind it: every seller's marketplace accounts are in the SELLER's own name, number, GST, PAN and bank.
 * The agency only gets added as a user. Pure functions, no I/O.
 */
import type { SellerSetup } from "./types";

export type CheckId = "gst" | "pan" | "bank" | "fssai" | "own_contact" | "address" | "photos" | "team_access";
export interface CheckItem { id: CheckId; title: string; short: string; why: string; note?: string }

export const SELLER_CHECKLIST: CheckItem[] = [
  { id: "gst", title: "GST number", short: "GSTIN — or a GST Enrolment ID to start on Meesho only", why: "Amazon and Flipkart need a GSTIN for almost every product, including sweets. Tax on each sale is counted under this number.", note: "No GST yet? Start on Meesho (own state only) with a free GST Enrolment ID, plus Instagram and WhatsApp, while we help you get GST." },
  { id: "pan", title: "PAN card", short: "PAN of the owner or the business", why: "Every marketplace checks the owner's identity with PAN." },
  { id: "bank", title: "Bank account in the shop's or owner's name", short: "Account + IFSC, in the same name as GST/PAN", why: "Marketplaces send sale money only to the seller's own bank account. The name must match GST and PAN." },
  { id: "fssai", title: "FSSAI licence (for food)", short: "14-digit FSSAI number, still valid", why: "Needed to sell any food online. Amazon also checks that it has enough validity left." },
  { id: "own_contact", title: "Seller's own mobile number and email", short: "Not the agency's number or email", why: "The mobile and email are the key to the account. They must be the seller's own, so the account stays fully theirs. One phone number cannot run many seller accounts." },
  { id: "address", title: "Shop address proof", short: "Rent agreement, electricity bill or GST address", why: "Used for pickup, returns and account verification." },
  { id: "photos", title: "3 or more clear product photos", short: "White background, label with MRP and FSSAI visible", why: "Listings without clear photos are hidden or rejected." },
  { id: "team_access", title: "Our team added as a user", short: "You invite us from your seller panel — no password sharing", why: "Amazon and Flipkart let you invite users by email with limited access. Our team logs in with its own login, so you never share your password or OTP, and you can remove us any time." },
];

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const validGstin = (s = "") => GSTIN.test(s.trim().toUpperCase());
export const validPan = (s = "") => PAN.test(s.trim().toUpperCase());
export const validEnrolmentId = (s = "") => /^[0-9A-Z]{15}$/.test(s.trim().toUpperCase());
const digits = (s = "") => s.replace(/\D/g, "").replace(/^0+/, "");
/** Last 10 digits match → it is the same mobile number. */
export const sameNumber = (a = "", b = "") => { const x = digits(a).slice(-10), y = digits(b).slice(-10); return x.length === 10 && x === y; };

export interface CheckCtx { email?: string; maxPhotos?: number; agencyPhones?: readonly string[]; isFood?: boolean; now?: number }
export interface CheckState { id: CheckId; done: boolean; text: string; warn?: string }

/** Works out which items are done from what the team has filled in for the seller. */
export function checklistStatus(s: SellerSetup, ctx: CheckCtx = {}): CheckState[] {
  const now = ctx.now ?? Date.now();
  const agencyNumber = (ctx.agencyPhones ?? []).some((p) => sameNumber(p, s.phone));
  const fssaiOk = /^\d{14}$/.test(s.fssaiNumber) && (!s.fssaiExpiry || new Date(s.fssaiExpiry).getTime() > now);
  const out: CheckState[] = [
    validGstin(s.gstin) ? { id: "gst", done: true, text: `GSTIN ${s.gstin.toUpperCase()}` }
      : validEnrolmentId(s.enrolmentId) ? { id: "gst", done: true, text: "GST Enrolment ID — Meesho (own state) only", warn: "Amazon and Flipkart still need a GSTIN." }
      : { id: "gst", done: false, text: s.gstin ? "GSTIN looks wrong — 15 characters, e.g. 37ABCDE1234F1Z5" : "Not added" },
    { id: "pan", done: validPan(s.pan), text: validPan(s.pan) ? `PAN ${s.pan.toUpperCase()}` : s.pan ? "PAN looks wrong — e.g. ABCDE1234F" : "Not added" },
    { id: "bank", done: s.bankVerified, text: s.bankVerified ? "Verified" : "Not verified yet" },
    ctx.isFood === false ? { id: "fssai", done: true, text: "Not needed (not food)" }
      : { id: "fssai", done: fssaiOk, text: fssaiOk ? `FSSAI ${s.fssaiNumber}` : s.fssaiNumber ? "Check the number (14 digits) and expiry date" : "Not added" },
    agencyNumber ? { id: "own_contact", done: false, text: "This is the agency's number", warn: "Use the seller's own mobile — never the agency's number." }
      : { id: "own_contact", done: !!(s.phone && ctx.email && s.ownContactConfirmed), text: !s.phone || !ctx.email ? "Add the seller's mobile and email" : s.ownContactConfirmed ? `+${s.phone} · ${ctx.email}` : "Confirm the accounts use these, not the agency's" },
    { id: "address", done: !!s.addressProof, text: s.addressProof ? "Received" : "Not received" },
    { id: "photos", done: (ctx.maxPhotos ?? 0) >= 3 || !!s.photosReady, text: (ctx.maxPhotos ?? 0) >= 3 ? `${ctx.maxPhotos} photos on a product` : s.photosReady ? "Received" : "Need 3+ per product" },
    { id: "team_access", done: !!s.teamAccess, text: s.teamAccess ? "Team added as user" : "Seller still has to invite our team email" },
  ];
  return out;
}

export const doneCount = (st: CheckState[]) => st.filter((x) => x.done).length;

/** WhatsApp text asking the seller for what is still missing. */
export function checklistMessage(sellerName: string, st: CheckState[], agency = "SIDDHIVYA"): string {
  const missing = SELLER_CHECKLIST.filter((c) => !st.find((x) => x.id === c.id)?.done);
  if (!missing.length) return `Namaste ${sellerName}! 🙏 Everything we need is ready. Thank you — we will start listing your products now. — ${agency}`;
  return [
    `Namaste ${sellerName}! 🙏 To open and run your online shop, please share these:`,
    ...missing.map((c, i) => `${i + 1}. ${c.title} — ${c.short}`),
    "",
    "Your Amazon / Flipkart accounts stay in YOUR name, YOUR mobile number and YOUR bank. We only need you to add our team as a user — no password sharing.",
    `— ${agency}`,
  ].join("\n");
}

/** FSSAI is only needed for food sellers. Unknown → treat as food (safer). */
export const isFoodBusiness = (industry = "") => !industry.trim() || !/cloth|saree|silk|garment|jewel|craft|toy|cosmetic|electronic|furniture|footwear|book/i.test(industry);
