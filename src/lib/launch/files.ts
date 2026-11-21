/**
 * Upload files for channels without an open API (Meesho, Blinkit, Zepto, Swiggy Instamart) and for Google.
 * Each portal has its own template that changes from time to time, so these sheets carry every field those
 * templates ask for, named plainly — the team copies the columns into the portal's latest template.
 */
import { CH } from "./channels";
import { aiSummary, FOOD_LABEL, structuredData } from "./engine";
import type { ChannelId, LaunchProduct, SellerSetup } from "./types";

export function download(content: BlobPart, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Quotes a CSV field and neutralises spreadsheet formula injection. */
const field = (v: string | number) => {
  if (typeof v === "number") return isFinite(v) ? String(v) : "";
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: (string | number)[][]) => "﻿" + rows.map((r) => r.map(field).join(",")).join("\r\n");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";

export function channelSheet(p: LaunchProduct, ch: ChannelId, s?: SellerSetup): { name: string; csv: string } {
  const l = p.listings.find((x) => x.channel === ch);
  if (!l) throw new Error("Channel listing not found");
  const head = ["Product name", "Brand", "SKU", "Category", "Pack size", "Net weight (g)", "Selling price (INR)", "MRP (INR)", "GST rate (%)", "Stock to send", "Shelf life (days)", "Ingredients", "Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5", "Description", "FSSAI licence no.", "GSTIN", "Pickup pincode", "Image 1 file", "Image 2 file", "Image 3 file"];
  const imgs = p.photos.slice(0, 3).map((_, i) => `${slug(p.name)}-${i + 1}.jpg`);
  const row = [l.title, p.brand, p.sku, FOOD_LABEL[p.category], p.size, p.weightGrams, l.price, p.mrp, Math.round(p.gstPct * 100), l.stock, p.shelfLifeDays, p.ingredients,
    ...Array.from({ length: 5 }, (_, i) => l.bullets[i] ?? ""), l.description, s?.fssaiNumber ?? "", s?.gstin ?? "", s?.pickupPincode ?? "", ...Array.from({ length: 3 }, (_, i) => imgs[i] ?? "")];
  return { name: `${slug(p.brand)}-${slug(p.name)}-${slug(CH[ch].label)}-upload.csv`, csv: toCsv([[`SIDDHIVYA upload sheet for ${CH[ch].label} — copy these columns into the portal's latest template`], head, row]) };
}

/** Product photos as separate files, named to match the upload sheet. */
export function downloadPhotos(p: LaunchProduct) {
  p.photos.slice(0, 6).forEach((ph, i) => setTimeout(() => {
    const a = document.createElement("a");
    a.href = ph.src;
    a.download = `${slug(p.name)}-${i + 1}.jpg`;
    a.click();
  }, i * 350));
}

/** Google Merchant Center product feed (tab-separated, the format Merchant Center accepts for file uploads). */
export function merchantFeed(items: LaunchProduct[], siteUrl: string): string {
  const head = ["id", "title", "description", "link", "image_link", "availability", "price", "brand", "condition", "identifier_exists", "google_product_category"];
  const rows = items.map((p) => {
    const g = p.listings.find((l) => l.channel === "google");
    return [p.sku || p.id, g?.title ?? `${p.brand} ${p.name}`, (g?.description ?? "").replace(/\s+/g, " "), `${siteUrl.replace(/\/$/, "")}/products/${slug(p.name)}`, `${siteUrl.replace(/\/$/, "")}/images/${slug(p.name)}-1.jpg`,
      p.stock > 0 ? "in_stock" : "out_of_stock", `${p.price.toFixed(2)} INR`, p.brand, "new", "no", p.category === "non_food" ? "" : "Food, Beverages & Tobacco > Food Items"];
  });
  return [head, ...rows].map((r) => r.map((v) => String(v).replace(/\t/g, " ")).join("\t")).join("\n");
}

export function searchPack(p: LaunchProduct, city: string, pageUrl: string): string {
  return [
    "SIDDHIVYA — search pack",
    "",
    "1) Paste this into the product page's <head> (structured data for Google and AI Overviews):",
    "",
    structuredData(p, pageUrl),
    "",
    "2) Publish this as /llms.txt (or add it to the existing one) so AI engines can read the facts:",
    "",
    aiSummary(p, city),
    "",
    "3) Allow AI search crawlers in robots.txt:",
    "",
    "User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /",
  ].join("\n");
}
