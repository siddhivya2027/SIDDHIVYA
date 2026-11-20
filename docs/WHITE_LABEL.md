# SIDDHIVYA white-label — what to fill in

Everything below hides itself or shows a safe default until it is filled in.

| What | Where | Now |
| --- | --- | --- |
| Agency email | `src/config/site.ts` → `contact.email` and `src/config/brand.ts` → `contactEmail` | Empty (email links hidden) |
| Phone / WhatsApp | `src/config/site.ts` → `contact.phones`, `contact.whatsapp`; `src/config/brand.ts` → `whatsapp` | +91 80722 76620 (swap for the new SIM) |
| Website address | Vercel env `NEXT_PUBLIC_SITE_URL` | Falls back to https://siddhivya.vercel.app |
| Seller plan prices | `src/lib/site/pricing.ts` → `SELLER_PLANS`, `ADD_ONS`; `SHOW_PRICES = false` shows "Ask for price" | Launch ₹15,000 · Growth ₹30,000 · Pro ₹55,000 |
| Office address, map, social links | `src/config/site.ts` | Empty (hidden) |
| Seller success stories | `src/config/site.ts` → `portfolio` | Empty (section hidden) |
| Technology credit | `src/config/brand.ts` → `poweredBy` (set `name: ""` to hide) | "Technology by Entraiot Solutions" |

Look and feel: colours in `src/app/globals.css` (`:root`, `.dark`, `.royal`), fonts in `src/app/site-fonts.ts`
(Marcellus for headings, Plus Jakarta Sans for text), logo in `src/components/shell/sidebar.tsx` (`BrandMark`).
