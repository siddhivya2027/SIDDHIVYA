import type { CalcId } from "@/lib/site/fees";
import type { ChannelId, ChannelKind, DeliveryMode } from "./types";

export interface ChannelInfo {
  id: ChannelId;
  label: string;
  kind: ChannelKind;
  color: string;
  delivery: DeliveryMode;
  /** Fee calculator used for profit per unit (none for social/search). */
  fees?: CalcId;
  /** Category id inside the fee calculator for food products. */
  foodCategory?: string;
  /** Title length the channel accepts comfortably. */
  titleMax: number;
  bulletCount: number;
  /** Plain-words line on how SIDDHIVYA delivers to this channel. */
  how: string;
  /** What has to be true once before this channel can sell. */
  needs: string;
  /** Server environment keys that switch on direct delivery. */
  env: string[];
}

export const CHANNELS: ChannelInfo[] = [
  { id: "amazon", label: "Amazon", kind: "marketplace", color: "#eb6834", delivery: "api", fees: "amazon", foodCategory: "grocery", titleMax: 150, bulletCount: 5,
    how: "Creates or updates the listing through Amazon's Selling Partner API and sets price and stock.",
    needs: "Amazon seller account, Grocery & Gourmet category approval, FSSAI licence valid for at least 6 more months.",
    env: ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_REFRESH_TOKEN", "AMAZON_SELLER_ID"] },
  { id: "flipkart", label: "Flipkart", kind: "marketplace", color: "#2a78d6", delivery: "api", fees: "flipkart", foodCategory: "grocery", titleMax: 100, bulletCount: 5,
    how: "The first listing is approved inside Flipkart Seller Hub. After that SIDDHIVYA updates price and stock through the Flipkart API.",
    needs: "Flipkart seller account, grocery category approval, FSSAI licence, the product's FSN from Seller Hub.",
    env: ["FLIPKART_APP_ID", "FLIPKART_APP_SECRET", "FLIPKART_LOCATION_ID"] },
  { id: "meesho", label: "Meesho", kind: "marketplace", color: "#993399", delivery: "sheet", fees: "meesho", foodCategory: "all", titleMax: 100, bulletCount: 4,
    how: "Meesho has no open seller API, so SIDDHIVYA makes the catalogue upload sheet for the Meesho Supplier Panel.",
    needs: "Meesho supplier account, GSTIN (or enrolment ID), FSSAI licence for food.",
    env: [] },
  { id: "blinkit", label: "Blinkit", kind: "quick", color: "#d6aa00", delivery: "sheet", fees: "blinkit", foodCategory: "fmcg", titleMax: 80, bulletCount: 3,
    how: "Makes the product sheet for the Blinkit Seller Hub. Blinkit's category team reviews it and stocks it in city warehouses.",
    needs: "Brand approval (often 3–6 weeks), FSSAI licence, stock delivered to Blinkit warehouses, clear best-before date.",
    env: [] },
  { id: "zepto", label: "Zepto", kind: "quick", color: "#6a28a0", delivery: "sheet", fees: "zepto", foodCategory: "fmcg", titleMax: 80, bulletCount: 3,
    how: "Makes the product sheet for the Zepto brand portal. Zepto stocks it in its own dark stores.",
    needs: "Brand approval, FSSAI licence, stock delivered to Zepto warehouses, clear best-before date.",
    env: [] },
  { id: "instamart", label: "Swiggy Instamart", kind: "quick", color: "#fc8019", delivery: "sheet", fees: "instamart", foodCategory: "fmcg", titleMax: 80, bulletCount: 3,
    how: "Makes the product sheet for the Swiggy Instamart brand team, who review and stock it.",
    needs: "Brand approval through the Instamart brand team, FSSAI licence, stock in Instamart warehouses.",
    env: [] },
  { id: "facebook", label: "Facebook", kind: "social", color: "#1877f2", delivery: "api", titleMax: 120, bulletCount: 0,
    how: "Posts the product photo and caption to the seller's Facebook Page through Meta's Graph API.",
    needs: "A Facebook Page, a Meta app with pages_manage_posts, and a long-lived Page token.",
    env: ["META_PAGE_ID", "META_PAGE_TOKEN"] },
  { id: "instagram", label: "Instagram", kind: "social", color: "#c2337a", delivery: "api", titleMax: 120, bulletCount: 0,
    how: "Publishes the post to the seller's Instagram professional account through Meta's Content Publishing API.",
    needs: "Instagram professional account linked to the Facebook Page, instagram_content_publish permission.",
    env: ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID"] },
  { id: "whatsapp", label: "WhatsApp", kind: "social", color: "#0b8a5f", delivery: "api", titleMax: 60, bulletCount: 0,
    how: "Sends an approved offer template to buyers who agreed to receive messages, through the WhatsApp Cloud API. Status posts are not possible by software.",
    needs: "WhatsApp Business number on the Cloud API, an approved marketing template, buyers who opted in.",
    env: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE"] },
  { id: "google", label: "Google & AI search", kind: "search", color: "#34a853", delivery: "sheet", titleMax: 150, bulletCount: 0,
    how: "Builds the Google Merchant Center product feed, the product + FAQ structured data and the AI-readable summary for the seller's site.",
    needs: "Google Merchant Center account (free listings) and the seller's website or shop page.",
    env: [] },
];

export const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, ChannelInfo>;
export const KIND_LABEL: Record<ChannelKind, string> = { marketplace: "Marketplaces — ships across India", quick: "Quick delivery — 10 minutes", social: "Meta — posts, ads and offers", search: "Google and AI search" };
export const CHANNEL_IDS = CHANNELS.map((c) => c.id);
