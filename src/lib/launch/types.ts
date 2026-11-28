/**
 * One-Click Launch — data model.
 * A LaunchProduct is one product a seller wants to sell everywhere. The agency fills it in once, SIDDHIVYA writes
 * a listing for every channel, the seller approves on his phone, and one click sends it to every channel.
 */
export type ChannelId = "amazon" | "flipkart" | "meesho" | "blinkit" | "zepto" | "instamart" | "facebook" | "instagram" | "whatsapp" | "google";
export type ChannelKind = "marketplace" | "quick" | "social" | "search";

/** How SIDDHIVYA delivers to a channel. "api" = sent directly when the keys are set; "sheet" = an upload file for the channel's own portal. */
export type DeliveryMode = "api" | "sheet";

export type FoodCategory = "sweets" | "snacks" | "pickles" | "spices" | "other_food" | "non_food";

export interface ChannelListing {
  channel: ChannelId;
  enabled: boolean;
  title: string;
  bullets: string[];
  description: string;
  /** Selling price on this channel, incl. GST (₹). */
  price: number;
  /** Units set aside for this channel. Quick-delivery apps hold their own warehouse stock. */
  stock: number;
  /** Edited by a person after the writer produced it. The writer never overwrites an edited listing. */
  edited?: boolean;
}

export type JobState = "idle" | "sending" | "live" | "demo_live" | "needs_upload" | "uploaded" | "needs_connection" | "failed";
export interface PublishJob {
  channel: ChannelId;
  state: JobState;
  message: string;
  url?: string;
  externalId?: string;
  ts: number;
  /** Done by a person outside the software (API down, no API, or a channel listed by hand). */
  manual?: boolean;
  by?: string;
}

export type ApprovalState = "not_sent" | "sent" | "approved" | "changes";
export interface Approval {
  state: ApprovalState;
  token?: string;
  link?: string;
  signed?: boolean;
  sentAt?: number;
  decidedAt?: number;
  receipt?: string;
  note?: string;
  by?: string;
}

export interface AdPlan { dailyBudget: number; split: Record<"meta" | "amazon_ads" | "flipkart_ads", number>; days: number; created?: boolean }

export interface Photo { id: string; src: string; w: number; h: number }

export interface LaunchProduct {
  id: string;
  clientId: string; // the seller
  createdAt: number;
  updatedAt: number;
  name: string;
  brand: string;
  category: FoodCategory;
  sku: string;
  /** Net weight / quantity shown on the label, e.g. "250 g". */
  size: string;
  weightGrams: number;
  price: number; // ₹ incl. GST
  mrp: number;
  cost: number; // ₹ cost per unit excl. GST
  gstPct: number; // product GST rate, e.g. 0.05
  stock: number; // total units the seller has
  shelfLifeDays: number;
  ingredients: string;
  story: string; // a line about who makes it and why it's different
  keyPoints: string[];
  keywords: string;
  photos: Photo[];
  banner?: string; // generated 1080×1080 post image (data URL)
  amazonProductType: string;
  flipkartFsn: string;
  listings: ChannelListing[];
  ads: AdPlan;
  approval: Approval;
  jobs: Partial<Record<ChannelId, PublishJob>>;
  faq: { q: string; a: string }[];
  liveSince?: number;
  /** MANUAL: the town/area to win first and nearby places, comma separated (e.g. "Vijayawada, Benz Circle, Guntur"). */
  areas?: string;
  /** MANUAL: other names people type, incl. local language (e.g. "kaju barfi, కాజు కట్లి"). */
  localNames?: string;
  /** MANUAL overrides typed by the team — used instead of the automatic ones when filled. */
  manualSearch?: { amazonBackend?: string; adKeywords?: string; negativeKeywords?: string; hashtags?: string };
}

/** An order the team types in by hand (phone, WhatsApp, shop counter, or a channel whose feed is not connected). */
export interface ManualOrder { id: string; clientId: string; launchId: string; channel: ChannelId; ts: number; qty: number; sale: number; fees: number; note: string; by: string }

/** Ticks on the "Customers not coming" playbook, one record per product. */
export interface PlaybookState { id: string; clientId: string; done: Record<string, { at: number; by: string; note: string }> }

export type AccountState = "not_started" | "applied" | "approved";
/** Everything a seller must have once before selling. Kept per seller (client). */
export interface SellerSetup {
  phone: string; // WhatsApp number with country code, digits only
  telegramChatId: string;
  fssaiNumber: string;
  fssaiExpiry: string; // ISO date
  gstin: string;
  pan: string;
  bankVerified: boolean;
  pickupPincode: string;
  accounts: Partial<Record<ChannelId, AccountState>>;
  /** Onboarding checklist extras (all optional so older records stay valid). */
  enrolmentId?: string; // GST Enrolment ID — Meesho-only start without GSTIN
  addressProof?: boolean;
  ownContactConfirmed?: boolean; // accounts use the SELLER's own mobile + email, not the agency's
  photosReady?: boolean;
  teamAccess?: boolean; // seller invited our team as a user on the marketplaces
}

export interface AlertRules { lowStockUnits: number; dailyReport: boolean; reportHour: number; onOrder: boolean; onApproval: boolean; lastDailyReport?: string }
export interface AlertLog { id: string; ts: number; to: string; text: string; status: "sent" | "pending_configuration" | "failed" }

export interface OptIn { id: string; clientId: string; name: string; phone: string; addedAt: number }

export interface Settlement { id: string; clientId: string; channel: ChannelId; date: string; orderId: string; sale: number; fees: number; payout: number; source: "imported" | "sample" }

export interface VisibilityCheck { id: string; launchId: string; engine: "Google" | "ChatGPT" | "Gemini" | "Perplexity" | "Google AI Overview"; question: string; found: boolean; ts: number }
