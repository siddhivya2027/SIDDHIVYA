# One-Click Launch — how SIDDHIVYA sells one product everywhere

Plain-words guide for the agency team. Pages: **One-Click Launch**, **Channels & stock**, **Search Everywhere**,
**Orders & money**, **Alerts & offers**, **Reel maker** — plus the seller's **approval page** (`/approve/...`).

## The flow

1. **Add the product once** (One-Click Launch → New product): name, pack size, price, MRP, cost, stock,
   best-before days, ingredients, story, key points, search words, photos (phone camera works).
2. **SIDDHIVYA writes everything**: a listing for each of the 10 channels in that channel's own length and
   style, profit per pack after each app's fees, a square post image, an FAQ, structured data and an AI summary.
   Anything the team edits by hand stays as they wrote it.
3. **Ready check** blocks publishing until the basics are right (photos, price ≤ MRP, stock, FSSAI number and
   expiry, accounts approved for quick-delivery apps) and warns about the rest (losses after fees, FSSAI under
   6 months, short shelf life for warehouses, missing Amazon product type / Flipkart FSN).
4. **Seller approval**: "Send for approval" creates a signed link; "Send on WhatsApp" opens WhatsApp with it.
   The seller sees the product, price and profit on every app and taps **APPROVE — ONE CLICK**. He gets an
   8-character code and a button to send it back on WhatsApp; the team enters it (or, if both are on the same
   computer, the product updates by itself). The team is also told on Telegram when `TELEGRAM_*` is set.
   A phone-call approval can be recorded too (logged with the team member's name).
5. **ONE CLICK**: sends the product to every channel switched on and shows each channel's own answer.

## What each channel really does

| Channel | How | Needs |
| --- | --- | --- |
| Amazon | Creates/updates the listing via SP-API Listings Items (`PUT /listings/2021-08-01/items`), price + stock | `AMAZON_SP_CLIENT_ID`, `AMAZON_SP_CLIENT_SECRET`, `AMAZON_SP_REFRESH_TOKEN`, `AMAZON_SELLER_ID`; product type per product; Grocery approval |
| Flipkart | Updates price + stock of a listing already approved in Seller Hub (Listings v3 update) | `FLIPKART_APP_ID`, `FLIPKART_APP_SECRET`, `FLIPKART_LOCATION_ID`; FSN per product |
| Meesho | Upload sheet (CSV) + photos for the Supplier Panel — Meesho has no open seller API | Supplier account |
| Blinkit · Zepto · Swiggy Instamart | Upload sheet (CSV) + photos for each brand portal; their teams approve and stock it | Brand approval (weeks), FSSAI, stock in their warehouses |
| Facebook | Posts photo + caption to the Page (Graph API `/{page}/photos`) | `META_PAGE_ID`, `META_PAGE_TOKEN` |
| Instagram | Hosts the image as an unpublished Page photo, then `/{ig-user}/media` → `media_publish` | + `META_IG_USER_ID` |
| WhatsApp | Approved template to opted-in buyers (Cloud API); or one-by-one links from your own WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` |
| Google & AI search | Merchant Center feed (TSV) + search pack (structured data, llms.txt, robots lines) | Merchant Center account, seller's site |

Nothing is reported **Live** unless the channel itself confirmed it. Without keys a channel shows
**Not connected** with the exact keys to add. In demo mode the switch *"show unconnected channels as Demo live"*
lets the full flow be presented — those rows are labelled **Demo live** and say "not really sent".

**Before first use of each API**: test with one product. Amazon's attribute rules differ by product type and
Amazon reports any missing attribute in its answer, which SIDDHIVYA shows word for word. Flipkart's payload
follows its Listings v3 update format — confirm it on the first connection against Flipkart's current docs.

## Stock, orders and money

- **Channels & stock**: one total; quick-delivery apps get a share (20% by default, editable per channel).
  "Update everywhere" pushes the new numbers to Amazon and Flipkart when they are connected.
- **Orders & money**: live order feeds need each channel's order API (later phase). Until then, products sent
  live in demo mode produce **Sample** orders (labelled) so the full loop can be shown, and the team can
  **import each app's settlement CSV** for real figures (date, order ID, sale, fees, payout columns are found
  automatically).

## Alerts

Telegram alerts for publishing, approvals, low stock and a daily report (per seller chat ID + the team chat).
The daily report goes out the first time anyone opens SIDDHIVYA after the chosen hour. A fixed-time report
with nobody online needs a server database and a scheduled job (Vercel Cron) — planned with the database phase.

## Where the data lives today

Products, sellers' setup, alerts and imports are saved **in the browser** of the computer used (like the rest
of the demo). Use one main computer for the agency until the database phase (`prisma/schema.prisma`, `DATABASE_URL`).
Photos are shrunk to about 100–200 KB each to fit.
