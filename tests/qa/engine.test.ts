import { test } from "node:test";
import assert from "node:assert/strict";
import { CH, CHANNELS } from "@/lib/launch/channels";
import { adAmounts, aiSummary, blocking, captionFor, profitOn, readiness, searchScores, structuredData, writeFaq, writeListings } from "@/lib/launch/engine";
import { DAY, kaju, setup } from "./fixtures";

test("E01 listing written for every channel", () => {
  const p = kaju();
  assert.equal(p.listings.length, CHANNELS.length);
  for (const l of p.listings) assert.ok(l.title.length > 0, `${l.channel} has a title`);
});

test("E02 titles: brand + name + size, within each channel's limit", () => {
  const p = kaju();
  for (const l of p.listings) {
    const info = CH[l.channel];
    assert.ok(l.title.length <= info.titleMax, `${l.channel} title ${l.title.length} > ${info.titleMax}`);
    assert.match(l.title, /Kaju Katli/);
  }
  assert.match(p.listings.find((l) => l.channel === "amazon")!.title, /250 g/);
});

test("E03 stock split: quick apps off by default, all stock on marketplaces", () => {
  const p = kaju();
  for (const l of p.listings) {
    if (CH[l.channel].kind === "quick") { assert.equal(l.enabled, false); assert.equal(l.stock, 0); }
    if (CH[l.channel].kind === "marketplace") assert.equal(l.stock, 100);
  }
});

test("E04 stock split: 20% shared across quick apps that are on, never more than total", () => {
  const p = kaju();
  const on = CHANNELS.filter((c) => c.kind !== "quick" || c.id === "blinkit" || c.id === "zepto").map((c) => c.id);
  const ls = writeListings(p, on);
  const blinkit = ls.find((l) => l.channel === "blinkit")!, zepto = ls.find((l) => l.channel === "zepto")!, amazon = ls.find((l) => l.channel === "amazon")!;
  assert.equal(blinkit.stock, 10); assert.equal(zepto.stock, 10); assert.equal(amazon.stock, 80);
  assert.ok(blinkit.stock + zepto.stock + amazon.stock <= p.stock);
});

test("E05 edited listing is never overwritten by the writer", () => {
  const p = kaju();
  const edited = p.listings.map((l) => (l.channel === "amazon" ? { ...l, title: "MY OWN TITLE", edited: true } : l));
  const again = writeListings({ ...p, name: "Changed", listings: edited });
  assert.equal(again.find((l) => l.channel === "amazon")!.title, "MY OWN TITLE");
});

test("E06 profit after fees: payout below price, profit = payout − cost", () => {
  const p = kaju();
  const f = profitOn(p, { channel: "amazon", price: 320 })!;
  assert.ok(f, "amazon has a fee calculator");
  assert.ok(f.payout < 320 && f.payout > 0, `payout ${f.payout}`);
  assert.ok(Math.abs(f.profit - (f.payout - p.cost)) < 1.01, `profit ${f.profit} vs payout ${f.payout} − cost ${p.cost}`);
  assert.equal(profitOn(p, { channel: "instagram", price: 320 }), null, "no fees on social");
  assert.equal(profitOn(p, { channel: "amazon", price: 0 }), null, "no price → no profit");
});

test("E07 ready check: complete product + seller → no blockers", () => {
  const c = readiness(kaju(), setup());
  assert.equal(blocking(c).length, 0, JSON.stringify(blocking(c)));
});

test("E08 ready check: blocks missing name, price, photo, stock, FSSAI; price above MRP", () => {
  const texts = (o: Parameters<typeof kaju>[0], s = setup()) => blocking(readiness(kaju(o), s)).map((x) => x.text).join(" | ");
  assert.match(texts({ name: "" }), /name is missing/);
  assert.match(texts({ price: 0 }), /price is missing/);
  assert.match(texts({ photos: [] }), /photo/);
  assert.match(texts({ stock: 0 }), /Stock is 0/);
  assert.match(texts({ price: 400, mrp: 360 }), /higher than MRP/);
  assert.match(texts({}, setup({ fssaiNumber: "" })), /FSSAI/);
  assert.match(texts({}, setup({ fssaiExpiry: "2020-01-01" })), /FSSAI licence expiry/);
});

test("E09 FSSAI expiring within 6 months is a warning for Amazon", () => {
  const soon = new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10);
  const c = readiness(kaju(), setup({ fssaiExpiry: soon }));
  assert.ok(c.some((x) => x.level === "warn" && /6 months/.test(x.text)));
});

test("E10 captions: price, where to buy; Instagram has hashtags; WhatsApp ≤ 300 chars", () => {
  const p = kaju();
  assert.match(captionFor(p, "facebook", ["Amazon"]), /Rs 320/);
  assert.match(captionFor(p, "instagram", ["Amazon"]), /#/);
  assert.ok(captionFor(p, "whatsapp", ["Amazon", "Flipkart"]).length <= 300);
});

test("E11 FAQ: at least 4 answers for a complete product; local question when town given", () => {
  assert.ok(kaju().faq.length >= 4);
  const local = kaju({ areas: "Vijayawada, Guntur" });
  const faq = writeFaq(local, "Vijayawada");
  assert.ok(faq.some((f) => /in Vijayawada\?/.test(f.q)), "has 'Where can I buy … in Vijayawada?'");
  const named = writeFaq(kaju({ localNames: "kaju barfi, కాజు కట్లి" }));
  assert.ok(named.some((f) => /కాజు కట్లి/.test(f.a)));
});

test("E12 structured data is valid JSON-LD with Product + FAQPage and keywords", () => {
  const html = structuredData(kaju({ localNames: "kaju barfi", areas: "Vijayawada" }), "https://example.in/p");
  const json = JSON.parse(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
  assert.equal(json[0]["@type"], "Product");
  assert.equal(json[0].offers.price, 320);
  assert.match(json[0].keywords, /Vijayawada/);
  assert.equal(json[1]["@type"], "FAQPage");
});

test("E13 AI summary lists brand, price, places and local names", () => {
  const s = aiSummary(kaju({ areas: "Vijayawada", localNames: "kaju barfi" }), "Vijayawada");
  assert.match(s, /# Sri Lakshmi Sweets Kaju Katli/);
  assert.match(s, /Price: Rs 320/);
  assert.match(s, /Sold in \/ delivers to: Vijayawada/);
  assert.match(s, /Also called: kaju barfi/);
});

test("E14 search scores: 5 scores 0–100; adding the town improves GEO", () => {
  const before = searchScores(kaju());
  assert.deepEqual(before.map((s) => s.id), ["SEO", "AEO", "GEO", "AIO", "AXO"]);
  for (const s of before) assert.ok(s.score >= 0 && s.score <= 100);
  const geo = (p: ReturnType<typeof kaju>) => searchScores(p).find((s) => s.id === "GEO")!;
  assert.ok(geo(kaju()).todo.some((t) => /town/.test(t)));
  assert.ok(geo(kaju({ areas: "Vijayawada" })).score > geo(kaju()).score);
});

test("E15 ad budget split adds up to the daily budget (±Rs 1 rounding)", () => {
  const sum = adAmounts({ dailyBudget: 500, split: { meta: 0.5, amazon_ads: 0.3, flipkart_ads: 0.2 }, days: 14 }).reduce((a, r) => a + r.perDay, 0);
  assert.ok(Math.abs(sum - 500) <= 1);
});

test("E16 manual hashtags override the automatic ones in the Instagram listing", () => {
  const p = kaju({ manualSearch: { hashtags: "#VijayawadaSweets #KajuKatli" } });
  const ig = writeListings(p).find((l) => l.channel === "instagram")!;
  assert.match(ig.description, /#VijayawadaSweets #KajuKatli/);
});
