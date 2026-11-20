import { Check } from "lucide-react";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { IQChat } from "@/components/site/iq-chat";
import { ROYAL } from "./site-fonts";
import { EnquiryForm, EnquiryModal } from "@/components/site/enquiry";
import { FeeCalculatorModal } from "@/components/site/fee-calculators";
import { ListingChecker } from "@/components/site/listing-checker";
import { ChannelMarquee, CtaBand, FactsBand, Hero, Portfolio, Reveal, SectionHead, SellerDashboard, SellerPlans, Services, SocialSection, Strategy, ToolsGrid, WhyUs } from "@/components/site/sections";
import { hasEmail, SITE, socialLinks } from "@/config/site";
import { CursorGlow } from "@/components/site/motion";

export const metadata: Metadata = {
  title: `${SITE.company} — grow your sales on Amazon, Flipkart, Myntra, Meesho & Instagram`,
  description: `${SITE.company} is a marketplace growth agency: listings, marketplace ads, Facebook & Instagram ads, photos, videos and a clear seller dashboard. Free listing check and marketplace fee calculators.`,
  alternates: { canonical: "/" },
};

const FAQ = [
  ["Which marketplaces do you work on?", "Amazon, Flipkart, Myntra and Meesho, plus Facebook, Instagram and WhatsApp for ads and posts. Quick-commerce apps like Blinkit and Zepto on request."],
  ["Do I have to give you my account password?", "No. Your seller accounts stay in your name. You add us as a user with limited permissions from your seller dashboard, and you can remove us any time."],
  ["How soon will I see results?", "Listing fixes often show within 2–4 weeks. Ads start bringing orders as soon as they go live, and we tune them every week. Your dashboard shows the numbers as they come in."],
  ["What does the seller dashboard show?", "Sales, orders, ad spend, ad return and stock for each marketplace, the photos and ads waiting for your approval, and your monthly reports. The preview on this site uses sample data."],
  ["Are the fee calculators exact?", "They use the latest public fee rules we could verify (November 2026) and show their sources. Marketplaces change fees often, so every rate can be edited to match your seller dashboard."],
  ["How do I start?", "Book a free growth call, call or WhatsApp us. We reply within one working day."],
] as const;

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org", "@type": "Organization", name: SITE.company, url: SITE.url, ...(hasEmail() ? { email: SITE.contact.email } : {}),
      telephone: SITE.contact.phones[0], address: { "@type": "PostalAddress", addressRegion: "Tamil Nadu", addressCountry: "IN", ...(SITE.location.address ? { streetAddress: SITE.location.address } : {}) },
      contactPoint: SITE.contact.phones.map((p) => ({ "@type": "ContactPoint", telephone: p, contactType: "sales", areaServed: "IN", availableLanguage: ["English", "Tamil"] })),
      sameAs: socialLinks().map(([, u]) => u),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE.company, url: SITE.url },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function Home() {
  return (
    <div className={`${ROYAL} min-h-dvh`}>
      <JsonLd />
      <CursorGlow />
      <SiteHeader />
      <main>
        <Hero />
        <ChannelMarquee />
        <FactsBand />
        <Services />
        <WhyUs />
        <Strategy />

        {/* Free tools */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHead id="tools" eyebrow="FREE TOOLS" title="Free tools for sellers," accent="no sign-up needed" body="Check a listing and fix it to 100/100, or work out exactly what each marketplace takes from a sale." />
          <div id="listing-check" className="mt-10 scroll-mt-24"><Reveal><ListingChecker /></Reveal></div>
          <div className="mt-14"><ToolsGrid /></div>
        </section>

        <SellerDashboard />
        <SocialSection />
        <Portfolio />
        <SellerPlans />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHead center id="faq" eyebrow="FAQ" title="Questions sellers" accent="often ask" />
          <div className="mt-8 divide-y divide-line rounded-3xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">{q}<span className="text-[20px] leading-none text-accent transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-[14px] text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHead eyebrow="GET IN TOUCH" title="Tell us about" accent="your shop" body="We'll look at where your shop is today and send a clear growth plan with costs. No obligation." />
            <Reveal>
              <ul className="mt-6 space-y-2.5 text-[14px] text-muted">
                {["Reply within one working day", "Call, WhatsApp or meet us in person in Tamil Nadu", "Written plan and price before any work starts"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pos" />{t}</li>)}
              </ul>
            </Reveal>
          </div>
          <Reveal className="gold-frame rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"><EnquiryForm /></Reveal>
        </section>

        <CtaBand />
      </main>
      <SiteFooter />
      <IQChat />
      <FeeCalculatorModal />
      <EnquiryModal />
    </div>
  );
}
