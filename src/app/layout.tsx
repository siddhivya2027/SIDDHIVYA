import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { BRAND_DEFAULTS } from "@/config/brand";
import { SITE } from "@/config/site";
import { bodyFont, royalFont } from "./site-fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${BRAND_DEFAULTS.productName} — marketplace growth for Amazon, Flipkart, Myntra & Meesho sellers`, template: `%s` },
  description: `${BRAND_DEFAULTS.company} grows online sellers on Amazon, Flipkart, Myntra, Meesho and Meta — listings, ads, creatives, social media and one clear dashboard for every seller.`,
  applicationName: BRAND_DEFAULTS.productName,
  openGraph: { type: "website", siteName: BRAND_DEFAULTS.productName, locale: "en_IN", url: "/" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

// Applies the saved theme before first paint so the page never flashes the wrong colours.
const themeScript = `try{var s=JSON.parse(localStorage.getItem("siddhivya-demo-v1")||"{}").state||{};var e=document.documentElement;if((s.theme||"dark")==="dark")e.classList.add("dark");if(s.brand&&s.brand.accent)e.dataset.accent=s.brand.accent}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${royalFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
