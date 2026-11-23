# SIDDHIVYA — live QA test plan (do this on the real site)

The automatic checks (`npm run qa`) cover the logic. This plan covers what only a real browser, real accounts and real apps can prove.
Tick each row. Write the date and who tested. If anything fails, take a screenshot and note the row ID.

Use two browsers (or one normal + one private window): **Browser A = team**, **Browser B = seller**.

| Who | Name | Date |
|---|---|---|
| Tester 1 | Salvin Jones (Entraiot) | |
| Tester 2 | Shalini L, MD & CEO (Entraiot) — sign-off | |
| Client check | Namachivayam (SIDDHIVYA) | |

---

## 1. Logins and safety

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| L1 | Open `/login` after the first owner exists | Normal sign-in only; "Create the owner account" never shows again | |
| L2 | Sign in with a wrong password, then with an email that doesn't exist | Same message both times: "Email or password is not right." | |
| L3 | Team & logins → Add team member (Shalini) | Temporary password shown once, with Copy | |
| L4 | Sign in as Shalini (Browser B) | Forced to set a new password before anything else | |
| L5 | Sellers → Add seller → Give login → sign in as the seller (Browser B) | Seller sees only "My products" and "Orders & money" | |
| L6 | As the seller, type `/team`, `/sellers`, `/channels`, `/manual` in the address bar | Sent back to "My products" every time | |
| L7 | Team & logins → Switch off the seller's login, then refresh Browser B | Seller is signed out at once | |
| L8 | Account menu → Sign out, then press Back | Login page, no data visible | |

## 2. Sellers, products and approval

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| P1 | One-Click Launch with no sellers → New product | Taken to Sellers page | |
| P2 | Add a product: name, 3 photos, price, MRP, stock, town "Vijayawada, Guntur", local names "kaju barfi, కాజు కట్లి" | Listings written for 10 channels; profit per app shown | |
| P3 | Set price above MRP | Red blocker: price higher than MRP | |
| P4 | Seller without FSSAI | Blocker on food channels | |
| P5 | Send approval link on WhatsApp → open on a phone → Approve | Receipt code shown; product turns "Approved" in Browser A within 30 s | |
| P6 | Seller login → open product → Ask for changes with a note | Team sees "Changes asked" + note; Telegram message if bot is set | |
| P7 | Seller login → Approve | Approved with code; ONE CLICK becomes available to the team | |

## 3. Publishing (needs each seller's real keys)

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| C1 | Channels & stock → seller's keys → Facebook → paste Page ID + token → Save & lock | "2 keys saved", Facebook "On"; values never shown again | |
| C2 | ONE CLICK on an approved product | Facebook post appears on the Page; link opens it | |
| C3 | Instagram (needs IG business ID too) | Post appears on Instagram | |
| C4 | Amazon (SP-API keys) | Listing created/updated; price and stock correct in Seller Central | |
| C5 | Flipkart (after first listing in Seller Hub) | Price and stock updated | |
| C6 | Meesho / Blinkit / Zepto / Instamart | Upload sheet downloads with FSSAI, GSTIN, price; mark "uploaded" after upload | |
| C7 | Remove a key → publish again | "Needs connection" with the exact missing key name — nothing breaks | |

## 4. Manual backup (when automation fails or buyers don't come)

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| M1 | Product → 9 · ONE CLICK → "Done by hand" on any channel → add link + note | Channel shows Live + "By hand"; product counts as live | |
| M2 | Product → 7 · Manual words → type your own ad keywords | Badge "Using your words"; Copy gives your list | |
| M3 | Type a very long Amazon search-terms line | Byte counter stays ≤ 250; extra words dropped | |
| M4 | "Back to automatic" | Automatic words return | |
| M5 | Orders & money → Add order by hand (WhatsApp, 2 packs) | Order listed with "By hand"; paid same day; stock left goes down by 2 | |
| M6 | Add order by hand for Amazon | Fees filled automatically; money date about 7 days later | |
| M7 | Delete the hand order | Gone; stock back up | |
| M8 | Manual push page | Products sorted slowest first; "Customers not coming" for live 3+ days with < 3 orders/week | |
| M9 | Tick 3 steps with notes; open in another browser | Same ticks and notes there ("Done by … · time") | |
| M10 | Copy each message (WhatsApp, Google Business, groups, shops) | Product name, town, price and where-to-buy are filled — no blanks | |

## 5. Orders, money, reports

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| R1 | Orders → Fetch Amazon orders now (Amazon connected) | "N orders checked"; real orders appear | |
| R2 | Import a Flipkart settlement CSV | Rows added; skipped rows counted | |
| R3 | Seller login → Orders | Only that seller's orders (including hand orders) | |
| R4 | Vercel → Settings → Cron Jobs → Run `/api/cron/daily` | Telegram report to agency group and each seller with a chat ID | |
| R5 | Next morning 8:00 am IST | Report arrives without anyone pressing anything | |

## 6. Look and feel

| ID | Steps | Expected | ✔ |
|---|---|---|---|
| U1 | Open on an Android phone (Chrome) | Readable, buttons reachable, no sideways scrolling | |
| U2 | Light/dark toggle | Opens in light; toggle works | |
| U3 | Slow network (phone data) | Pages still load; saving shows "will retry" if offline | |

---

**Pass rule:** all rows in sections 1, 2 and 4 must pass before handover. Section 3 rows pass per channel as each seller's accounts are connected.
