import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy";

export const metadata: Metadata = { title: "Privacy policy — SIDDHIVYA", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <PolicyPage title="Privacy policy" updated="20 November 2026" sections={[
      { h: "What we collect", p: ["When you fill in a form on this website we collect what you type: your name, phone number, email, business name, the service you are interested in and your message. When you become a client we also hold the seller-account details you choose to share with us so we can run your shop.", "The free listing check and the fee calculators run in your browser. What you type into them is not sent to us or stored by us."] },
      { h: "Why we collect it", p: ["To reply to your enquiry, prepare a proposal, set up and run your seller dashboard, and send you information you asked for. We do not sell your information and we do not share it for other companies' marketing."] },
      { h: "Who can see it", p: ["Our team, and the service providers we use to run the website and deliver your enquiry to us (hosting, email and messaging). They may only use it to provide that service to us."] },
      { h: "How long we keep it", p: ["Enquiries are kept for up to 24 months, or longer if you become a client and the law requires us to keep business records."] },
      { h: "Your choices", p: ["You can ask us to show, correct or delete the information we hold about you, or to stop contacting you, at any time by writing to the address below. We will reply within 30 days."] },
      { h: "Cookies and browser storage", p: ["The website remembers your theme choice in your browser. The dashboard preview stores its sample data in your browser. We do not use advertising cookies on this website."] },
    ]} />
  );
}
