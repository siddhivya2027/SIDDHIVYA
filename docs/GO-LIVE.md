# SIDDHIVYA — going live

Plain steps. Do them in this order. **Keys and passwords go into Vercel only — never into chat, WhatsApp or email.**

Live mode means: real logins, a real database, an empty start (no sample sellers or orders), each seller's own channel keys locked on the server, real Amazon orders, and a Telegram report every morning at 8:00 am.

---

## 1. Make three secret values (on your laptop)

Run this once. It prints three lines. Copy each value straight into Vercel in step 3 — do not save them anywhere else.

```bash
node -e "const c=require('crypto');console.log('SESSION_SECRET='+c.randomBytes(32).toString('base64url'));console.log('CRON_SECRET='+c.randomBytes(32).toString('base64url'));console.log('APPROVAL_SECRET='+c.randomBytes(32).toString('base64url'));console.log('TOKEN_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64'))"
```

(That is four values — the last one locks the sellers' keys. Never change TOKEN_ENCRYPTION_KEY after keys are saved, or the saved keys can't be opened.)

## 2. Connect the database

```text
Vercel → your SIDDHIVYA project → Storage → Create Database → Neon (Postgres) → Free plan → Region: Singapore → Connect to project (all environments)
```

This adds DATABASE_URL and DATABASE_URL_UNPOOLED by itself. The tables are created automatically on the next deploy.

## 3. Add the settings in Vercel

```text
Vercel → project → Settings → Environment Variables → add each (Environment: Production + Preview):

NEXT_PUBLIC_DEMO_MODE = false
SESSION_SECRET        = (from step 1)
CRON_SECRET           = (from step 1)
APPROVAL_SECRET       = (from step 1)
TOKEN_ENCRYPTION_KEY  = (from step 1)
TELEGRAM_BOT_TOKEN    = (from @BotFather — the agency bot)
TELEGRAM_CHAT_ID      = (the agency team's chat/group ID)
```

## 4. Deploy

```bash
git add -A && git commit -m "SIDDHIVYA live mode" && git push
```

Vercel builds by itself. Wait for "Ready".

## 5. Create the owner login (first person only)

```text
Open https://<your-site>/login → it shows "Create the owner account" → use siddhivya2027@gmail.com and a strong password
```

This screen appears only while there are no logins at all. After that it is gone for good.

## 6. Add the team, then the sellers

```text
Team & logins → Add team member → send the temporary password on WhatsApp
Sellers → Add seller → fill name, town, owner's WhatsApp and email → Give login → Send on WhatsApp
```

Everyone sets their own password at first sign-in.

## 7. Connect each seller's own accounts

```text
Channels & stock → choose the seller → "<seller>'s own account keys" → Keys → paste → Save & lock
```

The keys are locked on the server and never shown again. Upload-sheet apps (Meesho, Blinkit, Zepto, Instamart, Google) need no keys.

## 8. Check the morning job

```text
Vercel → project → Settings → Cron Jobs → /api/cron/daily → Run
```

Every day at 8:00 am India time it fetches new Amazon orders for every seller and sends the Telegram report to each seller (if their Telegram chat ID is filled on Channels & stock) and to the agency team.

---

### What each login can do

| Login | Sees | Can do |
|---|---|---|
| Owner | Everything | Everything, add/stop team logins |
| Team member | All sellers | Add products, send approvals, ONE CLICK publish, save keys, import settlements |
| Seller | Only their own products and orders | Approve or ask for changes; see prices, what they keep, where it's live, orders |

### Honest limits

- Meesho, Blinkit, Zepto and Instamart have no open API for sellers: SIDDHIVYA makes the upload sheet; the team uploads it.
- Flipkart: listings must be created once in Seller Hub; after that price and stock update with one click. Flipkart and quick-delivery money comes in through their settlement file (Orders → Import).
- Amazon order fees shown are worked out from Amazon's fee rules until the settlement file confirms them.
- WhatsApp Status cannot be posted by any software; offers go as approved WhatsApp template messages to opted-in buyers.
