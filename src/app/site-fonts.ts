import { Bricolage_Grotesque, Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

/** SIDDHIVYA website type: Bricolage Grotesque for headings and text, Fraunces italic for accent words, JetBrains Mono for small numbers. */
export const royalFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-royal", display: "swap" });
export const serifFont = Fraunces({ subsets: ["latin"], weight: ["400", "600"], style: ["italic"], variable: "--font-serif", display: "swap" });
export const monoFont = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono", display: "swap" });
/** Platform body face. */
export const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
export const ROYAL = `royal ${royalFont.variable} ${monoFont.variable} ${serifFont.variable}`;
