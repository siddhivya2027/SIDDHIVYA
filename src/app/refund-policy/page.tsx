import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy";

export const metadata: Metadata = { title: "Refund & cancellation policy — SIDDHIVYA", alternates: { canonical: "/refund-policy" } };

export default function Refunds() {
  return (
    <PolicyPage title="Refund & cancellation policy" updated="20 November 2026" sections={[
      { h: "One-time services (account set-up, photoshoots)", p: ["One-time services are priced in a written proposal. The advance covers work already started and is refundable in full only if you cancel before that work begins.", "If you cancel later, you pay for the work completed up to the cancellation date, and we hand over everything finished so far."] },
      { h: "Monthly plans", p: ["Monthly plans can be cancelled with 30 days' written notice after any minimum term stated in your proposal. Fees already paid for the current month are not refunded.", "Account set-up fees cover onboarding work and are not refundable once onboarding has started. On cancellation you can download your reports as files, and we remove our user access from your seller accounts."] },
      { h: "Advertising spend", p: ["Money paid to advertising platforms such as Meta or Google on your behalf is spent with those platforms and cannot be refunded by us."] },
      { h: "How refunds are paid", p: ["Approved refunds are paid to the original payment method or by bank transfer within 10 working days."] },
    ]} />
  );
}
