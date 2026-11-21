import "server-only";
import { z } from "zod";
import { UpstreamError, withRetry } from "@/server/connectors/resilience";

/**
 * Direct delivery to channels that offer an open API. Each publisher runs only when its keys are present on the
 * server; otherwise it answers "needs_connection" with the exact keys to add. Nothing is ever reported as live
 * unless the channel itself confirmed it.
 */
export const publishSchema = z.object({
  channel: z.enum(["amazon", "flipkart", "facebook", "instagram", "whatsapp"]),
  listing: z.object({
    title: z.string().min(1).max(250),
    bullets: z.array(z.string().max(500)).max(10),
    description: z.string().max(5000),
    price: z.number().positive(),
    stock: z.number().int().min(0),
  }),
  product: z.object({
    name: z.string().min(1).max(200),
    brand: z.string().max(100),
    sku: z.string().max(60),
    size: z.string().max(40),
    mrp: z.number().min(0),
    weightGrams: z.number().min(0),
    amazonProductType: z.string().max(80).default(""),
    flipkartFsn: z.string().max(40).default(""),
  }),
  image: z.string().max(6_000_000).optional(), // JPEG data URL
  recipients: z.array(z.object({ name: z.string().max(80), phone: z.string().regex(/^\d{10,15}$/) })).max(500).optional(),
});
export type PublishRequest = z.infer<typeof publishSchema>;
export interface PublishResult { state: "live" | "needs_connection" | "failed"; message: string; url?: string; externalId?: string; missing?: string[] }

const need = (keys: string[]): PublishResult | null => {
  const missing = keys.filter((k) => !process.env[k]);
  return missing.length ? { state: "needs_connection", message: `Add ${missing.join(", ")} on the server to switch this channel on.`, missing } : null;
};
const graph = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const { value } = await withRetry(async () => {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok) {
      const msg = typeof body === "object" && body && "error" in body ? JSON.stringify((body as { error: unknown }).error).slice(0, 400) : String(text).slice(0, 400);
      throw new UpstreamError(msg || `HTTP ${res.status}`, res.status, Number(res.headers.get("retry-after")) * 1000 || undefined);
    }
    return body as T;
  }, { attempts: 3 });
  return value;
}

function imageBlob(dataUrl?: string): Blob | null {
  if (!dataUrl?.startsWith("data:image/")) return null;
  const [meta, b64] = dataUrl.split(",");
  const type = meta.slice(5, meta.indexOf(";"));
  return new Blob([Buffer.from(b64, "base64")], { type });
}

/* ---------- Facebook Page ---------- */
async function facebookPhoto(caption: string, image: Blob, published: boolean) {
  const form = new FormData();
  form.set("source", image, "product.jpg");
  form.set(published ? "message" : "caption", caption);
  form.set("published", String(published));
  form.set("access_token", process.env.META_PAGE_TOKEN!);
  return call<{ id: string; post_id?: string }>(`${graph()}/${process.env.META_PAGE_ID}/photos`, { method: "POST", body: form });
}

async function publishFacebook(r: PublishRequest): Promise<PublishResult> {
  const miss = need(["META_PAGE_ID", "META_PAGE_TOKEN"]); if (miss) return miss;
  const img = imageBlob(r.image);
  if (!img) return { state: "failed", message: "A product photo or post image is needed for Facebook." };
  const res = await facebookPhoto(r.listing.description, img, true);
  return { state: "live", message: "Posted to the Facebook Page.", externalId: res.post_id ?? res.id, url: `https://www.facebook.com/${res.post_id ?? res.id}` };
}

/* ---------- Instagram (image hosted by an unpublished Page photo, then published to Instagram) ---------- */
async function publishInstagram(r: PublishRequest): Promise<PublishResult> {
  const miss = need(["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID"]); if (miss) return miss;
  const img = imageBlob(r.image);
  if (!img) return { state: "failed", message: "A post image is needed for Instagram." };
  const token = process.env.META_PAGE_TOKEN!;
  const photo = await facebookPhoto(r.listing.title, img, false);
  const info = await call<{ images?: { source: string; width: number }[] }>(`${graph()}/${photo.id}?fields=images&access_token=${encodeURIComponent(token)}`, { method: "GET" });
  const imageUrl = info.images?.sort((a, b) => b.width - a.width)[0]?.source;
  if (!imageUrl) return { state: "failed", message: "Meta did not return a public link for the image." };
  const ig = process.env.META_IG_USER_ID;
  const container = await call<{ id: string }>(`${graph()}/${ig}/media`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image_url: imageUrl, caption: r.listing.description.slice(0, 2200), access_token: token }) });
  // The container must finish processing before it can be published.
  for (let i = 0; i < 10; i++) {
    const st = await call<{ status_code?: string }>(`${graph()}/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`, { method: "GET" });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") return { state: "failed", message: "Instagram could not process the image." };
    await new Promise((res) => setTimeout(res, 1500));
  }
  const media = await call<{ id: string }>(`${graph()}/${ig}/media_publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ creation_id: container.id, access_token: token }) });
  const link = await call<{ permalink?: string }>(`${graph()}/${media.id}?fields=permalink&access_token=${encodeURIComponent(token)}`, { method: "GET" }).catch(() => ({ permalink: undefined }));
  return { state: "live", message: "Published to Instagram.", externalId: media.id, url: link.permalink };
}

/* ---------- WhatsApp offer (approved template to opted-in buyers) ---------- */
async function publishWhatsApp(r: PublishRequest): Promise<PublishResult> {
  const miss = need(["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE"]); if (miss) return miss;
  const to = r.recipients ?? [];
  if (!to.length) return { state: "failed", message: "No buyers have opted in yet. Add opted-in buyers on the Alerts & offers page." };
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
  let ok = 0; const errors: string[] = [];
  for (const p of to) {
    try {
      await call(`${graph()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: p.phone, type: "template",
          template: { name: process.env.WHATSAPP_TEMPLATE, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text: p.name || "there" }, { type: "text", text: r.product.name }, { type: "text", text: `Rs ${r.listing.price}` }] }] },
        }),
      });
      ok++;
    } catch (e) { errors.push(e instanceof Error ? e.message : "error"); }
  }
  if (!ok) return { state: "failed", message: `No messages were accepted. ${errors[0] ?? ""}`.trim() };
  return { state: "live", message: `Offer sent to ${ok} of ${to.length} opted-in buyers.${errors.length ? ` ${errors.length} failed.` : ""}` };
}

/* ---------- Amazon Selling Partner API (Listings Items) ---------- */
const AMAZON_IN = "A21TJRUUN4KGV";
async function amazonToken(): Promise<string> {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: process.env.AMAZON_SP_REFRESH_TOKEN!, client_id: process.env.AMAZON_SP_CLIENT_ID!, client_secret: process.env.AMAZON_SP_CLIENT_SECRET! });
  const j = await call<{ access_token: string }>("https://api.amazon.com/auth/o2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  return j.access_token;
}
async function publishAmazon(r: PublishRequest): Promise<PublishResult> {
  const miss = need(["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_REFRESH_TOKEN", "AMAZON_SELLER_ID"]); if (miss) return miss;
  if (!r.product.sku) return { state: "failed", message: "Set a SKU for the product first." };
  if (!r.product.amazonProductType) return { state: "failed", message: "Set the Amazon product type (shown in Seller Central when you add a product)." };
  const mp = AMAZON_IN, lang = "en_IN";
  const v = (value: string) => [{ value, language_tag: lang, marketplace_id: mp }];
  const attributes = {
    item_name: v(r.listing.title),
    brand: v(r.product.brand || r.product.name),
    bullet_point: r.listing.bullets.filter(Boolean).map((b) => ({ value: b, language_tag: lang, marketplace_id: mp })),
    product_description: v(r.listing.description),
    condition_type: [{ value: "new_new", marketplace_id: mp }],
    purchasable_offer: [{ marketplace_id: mp, currency: "INR", our_price: [{ schedule: [{ value_with_tax: r.listing.price }] }], ...(r.product.mrp ? { maximum_retail_price: [{ schedule: [{ value_with_tax: r.product.mrp }] }] } : {}) }],
    fulfillment_availability: [{ fulfillment_channel_code: "DEFAULT", quantity: r.listing.stock }],
    supplier_declared_has_product_identifier_exemption: [{ value: true, marketplace_id: mp }],
  };
  const token = await amazonToken();
  const url = `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${encodeURIComponent(process.env.AMAZON_SELLER_ID!)}/${encodeURIComponent(r.product.sku)}?marketplaceIds=${mp}&issueLocale=en_IN`;
  const res = await call<{ status: string; submissionId: string; issues?: { severity: string; message: string }[] }>(url, {
    method: "PUT", headers: { "content-type": "application/json", "x-amz-access-token": token },
    body: JSON.stringify({ productType: r.product.amazonProductType, requirements: "LISTING", attributes }),
  });
  const errors = (res.issues ?? []).filter((i) => i.severity === "ERROR");
  if (res.status !== "ACCEPTED" || errors.length) return { state: "failed", message: `Amazon did not accept the listing: ${errors.map((e) => e.message).join("; ").slice(0, 600) || res.status}` };
  return { state: "live", message: "Amazon accepted the listing. It appears on Amazon after Amazon's own checks (usually within a few hours).", externalId: res.submissionId, url: `https://sellercentral.amazon.in/myinventory/inventory?searchField=${encodeURIComponent(r.product.sku)}` };
}

/* ---------- Flipkart: price and stock for a listing already approved in Seller Hub ---------- */
async function publishFlipkart(r: PublishRequest): Promise<PublishResult> {
  const miss = need(["FLIPKART_APP_ID", "FLIPKART_APP_SECRET", "FLIPKART_LOCATION_ID"]); if (miss) return miss;
  if (!r.product.sku || !r.product.flipkartFsn) return { state: "failed", message: "Create the listing once in Flipkart Seller Hub, then add its SKU and FSN here." };
  const basic = Buffer.from(`${process.env.FLIPKART_APP_ID}:${process.env.FLIPKART_APP_SECRET}`).toString("base64");
  const tok = await call<{ access_token: string }>("https://api.flipkart.net/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api", { method: "GET", headers: { authorization: `Basic ${basic}` } });
  const body = { [r.product.sku]: { product_id: r.product.flipkartFsn, price: { mrp: r.product.mrp || r.listing.price, selling_price: r.listing.price, currency: "INR" }, inventory: [{ location_id: process.env.FLIPKART_LOCATION_ID, inventory: r.listing.stock }] } };
  const res = await call<Record<string, { status?: string; errors?: { description?: string }[] }>>("https://api.flipkart.net/sellers/listings/v3/update", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok.access_token}` }, body: JSON.stringify(body),
  });
  const row = res[r.product.sku];
  if (row && row.status && row.status !== "SUCCESS") return { state: "failed", message: `Flipkart: ${row.errors?.map((e) => e.description).join("; ") || row.status}` };
  return { state: "live", message: "Flipkart price and stock updated.", externalId: r.product.flipkartFsn, url: "https://seller.flipkart.com/" };
}

export async function publish(r: PublishRequest): Promise<PublishResult> {
  try {
    switch (r.channel) {
      case "facebook": return await publishFacebook(r);
      case "instagram": return await publishInstagram(r);
      case "whatsapp": return await publishWhatsApp(r);
      case "amazon": return await publishAmazon(r);
      case "flipkart": return await publishFlipkart(r);
    }
  } catch (e) {
    return { state: "failed", message: e instanceof Error ? e.message.slice(0, 600) : "Unexpected error" };
  }
}

/** Which direct channels have their keys set (names only — never values). */
export function channelEnv(): Record<string, { configured: boolean; missing: string[] }> {
  const sets: Record<string, string[]> = {
    amazon: ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_REFRESH_TOKEN", "AMAZON_SELLER_ID"],
    flipkart: ["FLIPKART_APP_ID", "FLIPKART_APP_SECRET", "FLIPKART_LOCATION_ID"],
    facebook: ["META_PAGE_ID", "META_PAGE_TOKEN"],
    instagram: ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID"],
    whatsapp: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE"],
    telegram: ["TELEGRAM_BOT_TOKEN"],
    approvals: ["APPROVAL_SECRET"],
  };
  return Object.fromEntries(Object.entries(sets).map(([k, keys]) => { const missing = keys.filter((x) => !process.env[x]); return [k, { configured: missing.length === 0, missing }]; }));
}
