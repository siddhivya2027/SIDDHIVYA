/** Single source of truth for product branding. Change here (or in Settings → Brand at runtime). */
export const BRAND_DEFAULTS = {
  company: "SIDDHIVYA",
  companyLegal: "SIDDHIVYA",
  productName: "SIDDHIVYA",
  tagline: "Marketplace Growth Platform",
  accent: "saffron" as "saffron" | "lotus" | "emerald",
  city: "Tamil Nadu, India",
  /** Leave empty until the agency email is ready — email links hide themselves when this is empty. */
  contactEmail: "",
  /** WhatsApp number with country code, digits only (e.g. "919876543210"). Leave empty to hide WhatsApp links. */
  whatsapp: "918072276620",
  /** Technology partner credit shown in small print in the footer and sign-in screen. Set name to "" to hide. */
  poweredBy: { name: "Entraiot Solutions", url: "https://entrabuild.com" },
};
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
export const DEMO_NOTICE = "Sample data — not connected to live marketplace accounts.";
