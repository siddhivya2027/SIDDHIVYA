import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

export const alt = `${SITE.company} — marketplace growth agency for Amazon, Flipkart, Myntra and Meesho sellers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when the site is shared on WhatsApp, LinkedIn, Facebook or X. */
export default function OpengraphImage() {
  const contact = [SITE.contact.email, ...SITE.contact.phones].filter(Boolean).join(" · ");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "radial-gradient(900px 500px at 0% 0%, #5a1e46 0%, transparent 70%), radial-gradient(800px 500px at 100% 100%, #7a3a0e 0%, transparent 70%), #0f0a14", color: "#fbf3ea", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #e0609a, #f5a742)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700 }}>S</div>
          <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 38, letterSpacing: 6, color: "#f5a742" }}>{SITE.company}</span><span style={{ fontSize: 22, opacity: 0.8 }}>Marketplace growth agency</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 72, lineHeight: 1.05 }}>Grow your sales on every marketplace.</span>
          <span style={{ fontSize: 30, opacity: 0.85, fontFamily: "sans-serif" }}>Listings · Ads · Photos & videos · Social media · Seller dashboard</span>
        </div>
        <span style={{ fontSize: 24, opacity: 0.8, fontFamily: "sans-serif" }}>{contact}</span>
      </div>
    ),
    size,
  );
}
