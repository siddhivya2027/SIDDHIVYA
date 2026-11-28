import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE, waHref } from "@/config/site";
import { SELLER_CHECKLIST } from "@/lib/launch/onboarding";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: `Seller checklist — what you need to sell online · ${SITE.company}`,
  description: "GST, PAN, bank account, FSSAI, your own mobile and email, address proof, product photos — the documents a shop needs to start selling on Amazon, Flipkart and Meesho.",
  alternates: { canonical: "/seller-checklist" },
};

/** Printable one-page checklist for new sellers. Same list the agency team uses inside the software. */
export default function SellerChecklistPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/#checklist" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to website</Link>
          <PrintButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:py-0">
        <p className="text-[13px] font-semibold tracking-wide text-accent">{SITE.company}</p>
        <h1 className="mt-1 text-[28px] font-semibold">Seller checklist — what you need to sell online</h1>
        <p className="mt-2 text-[15px] text-muted">Keep these ready before we open your shop on Amazon, Flipkart, Meesho and the quick-delivery apps.</p>
        <ol className="mt-8 space-y-4">
          {SELLER_CHECKLIST.map((c, i) => (
            <li key={c.id} className="flex gap-4 rounded-2xl border border-line p-4 break-inside-avoid">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-line text-[13px] font-semibold" aria-hidden>{i + 1}</span>
              <div>
                <p className="text-[16px] font-semibold">{c.title}</p>
                <p className="text-[13.5px] font-medium text-accent">{c.short}</p>
                <p className="mt-1 text-[14px] text-muted">{c.why}</p>
                {c.note && <p className="mt-1 text-[13px] text-faint">{c.note}</p>}
              </div>
            </li>
          ))}
        </ol>
        <section className="mt-8 rounded-2xl bg-raised p-5 text-[14px] break-inside-avoid">
          <h2 className="text-[16px] font-semibold">Your shop, your name, your number</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>Every marketplace account is opened in your name, with your own mobile number, email, GST, PAN and bank account.</li>
            <li>Sale money goes straight to your bank — never through us.</li>
            <li>You add our team as a user from your seller panel. Never share your password or OTP with anyone.</li>
            <li>Our team can fill every form for you; you only share documents and read out the OTP once, when the account is opened.</li>
          </ul>
        </section>
        <p className="mt-8 text-[14px] text-muted">
          Questions? Call or WhatsApp {SITE.contact.phones.join(" · ")}{SITE.contact.email ? ` · ${SITE.contact.email}` : ""}.{" "}
          <a href={waHref(`Hi ${SITE.company}, I have my documents ready to start selling online.`)} className="font-medium text-accent print:hidden">Send us a WhatsApp</a>
        </p>
      </main>
    </div>
  );
}
