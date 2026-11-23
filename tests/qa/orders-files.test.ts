import { test } from "node:test";
import assert from "node:assert/strict";
import { channelSheet, merchantFeed, toCsv } from "@/lib/launch/files";
import { importSettlements, manualToOrders, sampleOrders, unitsSold } from "@/lib/launch/orders";
import type { ManualOrder } from "@/lib/launch/types";
import { DAY, kaju, setup } from "./fixtures";

const hand = (o: Partial<ManualOrder>): ManualOrder => ({ id: "H-1", clientId: "seller-1", launchId: "L1", channel: "whatsapp", ts: Date.UTC(2026, 10, 20), qty: 2, sale: 640, fees: 0, note: "Ravi, Benz Circle", by: "Team", ...o });

test("O01 hand order (direct WhatsApp/phone) is paid the same day, full amount", () => {
  const [o] = manualToOrders([hand({})]);
  assert.equal(o.payout, 640); assert.equal(o.payoutOn, o.ts); assert.equal(o.status, "By hand"); assert.equal(o.sample, false);
  assert.match(o.orderId!, /Ravi/);
});

test("O02 hand order from an app follows that app's payout days, minus fees", () => {
  const [o] = manualToOrders([hand({ channel: "amazon", fees: 90 })]);
  assert.equal(o.payout, 550); assert.equal(o.payoutOn, o.ts + 7 * DAY);
});

test("O03 units sold counts hand orders for the right product only", () => {
  const list = manualToOrders([hand({}), hand({ id: "H-2", qty: 3 }), hand({ id: "H-3", launchId: "OTHER", qty: 50 })]);
  assert.equal(unitsSold(list, "L1"), 5);
});

test("O04 no sample orders before a product is live", () => {
  assert.deepEqual(sampleOrders(kaju({ liveSince: undefined })), []);
});

test("O05 settlement import: Amazon-style file with quotes and commas", () => {
  const csv = '﻿posted-date,order-id,item-price,commission,net-payout\r\n2026-11-18,"405-1234567-1234567","1,280.00",-180.50,"1,099.50"\r\n2026-11-19,405-7654321,320,45,275\r\n';
  const r = importSettlements(csv, "seller-1", "amazon");
  assert.equal(r.error, undefined); assert.equal(r.rows.length, 2); assert.equal(r.skipped, 0);
  assert.deepEqual([r.rows[0].sale, r.rows[0].fees, r.rows[0].payout], [1280, 180.5, 1099.5]);
  assert.equal(r.rows[0].id, "amazon-405-1234567-1234567");
});

test("O06 settlement import: bad rows skipped, no header gives a clear error", () => {
  const r = importSettlements("Date,Order ID,Amount,Fee,Net\nnot a date,X1,10,1,9\n2026-11-01,,10,1,9\n2026-11-02,X3,10,1,9\n", "s", "flipkart");
  assert.equal(r.rows.length, 1); assert.equal(r.skipped, 2);
  assert.match(importSettlements("a,b\n1,2\n", "s", "flipkart").error ?? "", /header row/);
});

test("O07 settlement import: net worked out when the file has no payout column", () => {
  const r = importSettlements("Order Date,Order Id,Sale Amount,Commission\n2026-11-02,M1,500,75\n", "s", "meesho");
  assert.equal(r.rows[0].payout, 425);
});

test("O08 CSV: quotes, commas and new lines kept; formula injection blocked", () => {
  const csv = toCsv([["a,b", 'say "hi"', "line1\nline2", "=HYPERLINK(1)", "+91 98765", 5]]);
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv, /"a,b"/); assert.match(csv, /"say ""hi"""/); assert.match(csv, /"line1\nline2"/);
  assert.match(csv, /'=HYPERLINK/); assert.match(csv, /'\+91/);
});

test("O09 upload sheets for Meesho and quick apps include FSSAI, GSTIN and price", () => {
  const p = kaju();
  for (const ch of ["meesho", "blinkit", "zepto", "instamart"] as const) {
    const s = channelSheet(p, ch, setup());
    assert.match(s.name, /\.csv$/);
    assert.match(s.csv, /10019022001234/); assert.match(s.csv, /37ABCDE1234F1Z5/); assert.match(s.csv, /,320,360,/);
  }
});

test("O10 Google Merchant feed: one header + one line per product, tab separated", () => {
  const feed = merchantFeed([kaju(), kaju({ id: "L2", sku: "SLS-KAJU-500G", size: "500 g" })], "https://example.in");
  const lines = feed.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[0].includes("\t"));
  assert.match(feed, /320(\.00)? INR/);
});
