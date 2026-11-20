import { Marcellus, Plus_Jakarta_Sans } from "next/font/google";

/** SIDDHIVYA display face for the public website's headings. */
export const royalFont = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-royal", display: "swap" });
/** SIDDHIVYA body face for the website and the platform. */
export const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
export const ROYAL = `royal ${royalFont.variable}`;
