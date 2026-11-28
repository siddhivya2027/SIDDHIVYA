/**
 * PUBLIC WEBSITE SETTINGS — edit this one file to change contacts, social links, numbers and portfolio.
 * Anything left empty ("") is hidden on the site automatically. Never put numbers here that are not real.
 */
export const SITE = {
  /** Full public address of the site, used for SEO (sitemap, canonical links, social previews). Set NEXT_PUBLIC_SITE_URL once the domain is ready. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siddhivya.vercel.app",
  company: "SIDDHIVYA",
  brandLine: "SIDDHIVYA · Marketplace Growth Agency",

  contact: {
    /** Agency email — empty for now, so every email link stays hidden until it is filled in. */
    email: "",
    /** Replace with the agency's new SIM number once it is active. */
    phones: ["+91 90636 16726"],
    /** Digits only, with country code. Used for the WhatsApp button and the sticky bar. */
    whatsapp: "919063616726",
    whatsappChannel: "", // e.g. https://whatsapp.com/channel/...
  },

  location: {
    city: "Tamil Nadu, India",
    address: "", // full office address — shown in the footer and used for SEO when filled
    mapUrl: "", // Google Maps link
  },

  /** Social pages. Each icon appears only when its link is filled in. */
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
  },

  /** Real numbers only. A stat with an empty value is hidden. */
  stats: [
    { value: "", label: "Sellers grown" },
    { value: "", label: "Products listed" },
    { value: "", label: "Average sales growth" },
  ],

  /** Real seller success stories only, with the seller's permission. The section hides itself while this is empty. */
  portfolio: [] as { name: string; place: string; work: string; tags: string[]; url: string; hue: number }[],
} as const;

export const hasEmail = () => SITE.contact.email.trim().length > 0;
export const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;
export const waHref = (text?: string) => `https://wa.me/${SITE.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const socialLinks = () => (Object.entries(SITE.social) as [keyof typeof SITE.social, string][]).filter(([, u]) => u);
export const realStats = () => SITE.stats.filter((s) => s.value.trim());
