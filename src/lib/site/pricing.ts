/**
 * SIDDHIVYA seller plans — single source for the public site and the IQ assistant.
 * Amounts are INR a month and exclude GST. Ad spend is paid by the seller directly to the platform.
 * Change prices here only. Set SHOW_PRICES to false to show "Ask for price" instead of amounts.
 */
export const SHOW_PRICES = true;
export const GST_RATE = 0.18;

export interface SellerPlan {
  id: "launch" | "growth" | "pro";
  name: string;
  forWho: string;
  monthly: number;
  features: string[];
  highlight?: boolean;
}

export const SELLER_PLANS: SellerPlan[] = [
  {
    id: "launch",
    name: "Launch",
    forWho: "New to selling online",
    monthly: 15_000,
    features: ["1 marketplace", "Listing set-up and fixes for up to 25 products", "Your own seller dashboard login", "Monthly report in plain words"],
  },
  {
    id: "growth",
    name: "Growth",
    forWho: "Ready to advertise",
    monthly: 30_000,
    highlight: true,
    features: ["2 marketplaces", "Facebook & Instagram ads managed", "8 creatives a month", "Posting to Facebook and Instagram", "Report every two weeks"],
  },
  {
    id: "pro",
    name: "Pro",
    forWho: "Established brands",
    monthly: 55_000,
    features: ["All marketplaces", "Marketplace ads + Meta ads", "20 creatives a month (photos and videos)", "Search everywhere: Google, Amazon and AI answers", "Weekly call with your manager"],
  },
];

export const ADD_ONS: [string, string][] = [
  ["New seller account set-up (registration help, catalogue upload)", "₹10,000 – ₹25,000 one-time"],
  ["Ads management above your plan", "10–15% of ad spend, minimum ₹5,000 a month"],
  ["Extra creatives", "₹500 per image · ₹1,500 per short video"],
  ["Product photoshoot", "Quoted per shoot"],
];

export const planPrice = (p: SellerPlan) => (SHOW_PRICES ? `₹${p.monthly.toLocaleString("en-IN")}` : "Ask for price");
