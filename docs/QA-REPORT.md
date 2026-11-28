# SIDDHIVYA — QA report

**Date run:** 28 Nov 2026 · **Build:** live version with manual backup + seller onboarding checklist · **Result: 65 of 65 automatic checks passed.**

Run it yourself any time:

```bash
npm install && npm run qa
```

## What was tested automatically

| Area | Checks | What they prove |
|---|---|---|
| A — Logins, roles, API (with a test database) | 14 | First owner only once; wrong password and unknown email look the same; forged/expired cookies refused; sellers cannot see other sellers, cannot publish, cannot see keys, cannot add logins; switched-off login stops at once; keys stored locked and never sent back; seller approval writes to the database; morning job needs its secret; website leads saved |
| E — Product engine | 16 | Listing for all 10 channels; titles within each app's limit; stock split never more than total; edited text never overwritten; profit after fees; ready-check blocks (no name, price, photo, stock, FSSAI, price above MRP, expired FSSAI); 6-month FSSAI warning; captions; FAQ; JSON-LD; AI summary; 5 search scores; ad budget; manual hashtags |
| M — Manual backup | 10 | Local words from town + nearby places + Telugu names; Amazon search terms always under 250 bytes and without brand/title words; your typed keywords replace automatic ones and can be cleared; "customers not coming" rule; playbook complete with no blank values |
| O — Orders, money, files | 10 | Hand orders (direct = paid same day; app = app's payout days); stock sold counts hand orders; settlement CSV import (quotes, commas, bad rows, missing payout column); CSV safety; Meesho/quick-app upload sheets; Google Merchant feed |
| C — Seller onboarding checklist | 8 | 8 items shared by website and software; agency number refused as a seller's number; GSTIN / Enrolment ID / PAN / FSSAI checks; photos; WhatsApp message lists only missing items and says accounts stay in the seller's name |
| S — Security | 7 | Passwords scrambled (scrypt, salted); temporary passwords; cookie flags; AES-256-GCM key locking (tamper and wrong-key fail); signed approval links (changed price / expired refused); receipt codes; sellers can never read FSSAI/GST/phone, playbook, settings, leads |

## Bug found by the tests and fixed

| ID | Problem | Fix |
|---|---|---|
| QA-1 | One damaged or half-saved product record crashed the whole morning Telegram report for every seller. | The report now skips damaged records and keeps going; one seller's Telegram failing no longer stops the others. Covered by check A13. |

## Not testable here (check on the live site — see QA-TEST-PLAN.md)

- Real Amazon, Flipkart, Facebook, Instagram, WhatsApp calls (need each seller's real keys).
- Real Telegram delivery, Vercel cron timing, Neon database.
- Look and feel on phone and laptop.

## Full run output

```text
✔ A01 /api/auth/me before anyone exists: owner setup needed
✔ A02 owner setup: weak password refused; first owner created; second setup refused
✔ A03 login: wrong password and unknown email get the same answer
✔ A04 a forged or expired cookie is not accepted
✔ A05 owner adds a team member and a seller login (temporary password, must change)
✔ A06 sellers cannot manage logins, save data, keys, publish or fetch orders
✔ A07 team saves data; each seller sees only their own products, orders and seller record
✔ A08 seller approves their own product in the app; cannot touch another seller's
✔ A09 seller keys: saved locked, only names come back, removing works, wrong key names refused
✔ A10 publish with missing keys says exactly which keys, without calling the app
✔ A11 orders: sellers only get their own
✔ A12 switched-off login stops working at once; owner can't be switched off by a manager
✔ A13 morning job: refuses without the secret; runs and sends nothing when Telegram is off
✔ A14 website leads are saved to the database
✔ E01 listing written for every channel
✔ E02 titles: brand + name + size, within each channel's limit
✔ E03 stock split: quick apps off by default, all stock on marketplaces
✔ E04 stock split: 20% shared across quick apps that are on, never more than total
✔ E05 edited listing is never overwritten by the writer
✔ E06 profit after fees: payout below price, profit = payout − cost
✔ E07 ready check: complete product + seller → no blockers
✔ E08 ready check: blocks missing name, price, photo, stock, FSSAI; price above MRP
✔ E09 FSSAI expiring within 6 months is a warning for Amazon
✔ E10 captions: price, where to buy; Instagram has hashtags; WhatsApp ≤ 300 chars
✔ E11 FAQ: at least 4 answers for a complete product; local question when town given
✔ E12 structured data is valid JSON-LD with Product + FAQPage and keywords
✔ E13 AI summary lists brand, price, places and local names
✔ E14 search scores: 5 scores 0–100; adding the town improves GEO
✔ E15 ad budget split adds up to the daily budget (±Rs 1 rounding)
✔ E16 manual hashtags override the automatic ones in the Instagram listing
✔ M01 local search words built from the town and nearby places
✔ M02 Amazon search terms: under 250 bytes even with Telugu, no brand, no title words
✔ M03 Amazon search terms: a long manual line is cut to fit, never over the limit
✔ M04 manual ad and negative keywords replace the automatic ones
✔ M05 clearing a manual box goes back to automatic
✔ M06 sales health: not live / just started / customers not coming / selling
✔ M07 sales health ignores orders older than 7 days and future-dated ones
✔ M08 playbook: unique steps, every group filled, every step has steps to follow
✔ M09 playbook messages carry the product, town, price and order places
✔ M10 playbook works for a seller with no phone, town or channels yet
✔ C01 checklist has 8 items with unique ids, same list for website and software
✔ C02 a fully ready seller scores 8/8
✔ C03 the agency's own number is refused as the seller's number
✔ C04 own contact needs phone, email AND the confirmation tick
✔ C05 GST: valid GSTIN, or Enrolment ID with a warning that Amazon/Flipkart still need GSTIN
✔ C06 PAN format and FSSAI (14 digits, not expired; skipped for non-food)
✔ C07 photos count from products, or the manual tick
✔ C08 WhatsApp message lists only what is missing and says accounts stay in the seller's name
✔ O01 hand order (direct WhatsApp/phone) is paid the same day, full amount
✔ O02 hand order from an app follows that app's payout days, minus fees
✔ O03 units sold counts hand orders for the right product only
✔ O04 no sample orders before a product is live
✔ O05 settlement import: Amazon-style file with quotes and commas
✔ O06 settlement import: bad rows skipped, no header gives a clear error
✔ O07 settlement import: net worked out when the file has no payout column
✔ O08 CSV: quotes, commas and new lines kept; formula injection blocked
✔ O09 upload sheets for Meesho and quick apps include FSSAI, GSTIN and price
✔ O10 Google Merchant feed: one header + one line per product, tab separated
✔ S01 passwords are stored scrambled (scrypt) and checked correctly
✔ S02 temporary passwords: 10 characters, no look-alike letters, all different
✔ S03 login cookie: HttpOnly, SameSite, 14 days, signed
✔ S04 seller keys locked with AES-256-GCM; tampering or a wrong key fails
✔ S05 approval link: signed, can't be changed, expires
✔ S06 approval receipt code proves the decision came through the server
✔ S07 sellers can never read setup (FSSAI/GST/phone), playbook, settings, leads or logs
ℹ tests 65
ℹ suites 0
ℹ pass 65
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1475.89901
```
