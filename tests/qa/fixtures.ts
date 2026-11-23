/** Shared test data: a real-looking Kaju Katli product from a Vijayawada sweet shop. */
import { newLaunch, writeListings, writeFaq } from "@/lib/launch/engine";
import type { LaunchProduct, SellerSetup } from "@/lib/launch/types";

export const DAY = 86400000;

export function kaju(over: Partial<LaunchProduct> = {}): LaunchProduct {
  const p: LaunchProduct = {
    ...newLaunch("L1", "seller-1", "Sri Lakshmi Sweets"),
    name: "Kaju Katli", size: "250 g", weightGrams: 300, price: 320, mrp: 360, cost: 150, gstPct: 0.05, stock: 100, shelfLifeDays: 30,
    sku: "SLS-KAJU-250G", ingredients: "Cashew nuts, sugar, ghee, edible silver leaf",
    story: "Handmade every morning in a family sweet shop near Vijayawada, using whole cashews and pure ghee — no colours, no preservatives.",
    keyPoints: ["Made with whole cashews and pure ghee", "No artificial colours or preservatives"],
    keywords: "cashew sweet, diwali gift, kaju barfi",
    photos: [1, 2, 3].map((i) => ({ id: `ph${i}`, src: "data:image/jpeg;base64,AAAA", w: 1000, h: 1000 })),
    ...over,
  };
  const withListings = { ...p, listings: writeListings(p) };
  return { ...withListings, faq: over.faq ?? writeFaq(withListings, "Vijayawada") };
}

export function setup(over: Partial<SellerSetup> = {}): SellerSetup {
  const in1y = new Date(Date.now() + 365 * DAY).toISOString().slice(0, 10);
  return { phone: "919876543210", telegramChatId: "", fssaiNumber: "10019022001234", fssaiExpiry: in1y, gstin: "37ABCDE1234F1Z5", pan: "ABCDE1234F", bankVerified: true, pickupPincode: "520010", accounts: { amazon: "approved", flipkart: "approved", meesho: "approved", blinkit: "approved", zepto: "approved", instamart: "approved" }, ...over };
}
