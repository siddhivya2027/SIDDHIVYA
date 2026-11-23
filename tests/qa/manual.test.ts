import { test } from "node:test";
import assert from "node:assert/strict";
import { AMAZON_BACKEND_MAX, GROUPS, keywordPack, playbookTasks, salesHealth } from "@/lib/launch/manual";
import { DAY, kaju } from "./fixtures";

const bytes = (s: string) => new TextEncoder().encode(s).length;
const local = () => kaju({ areas: "Vijayawada, Benz Circle, Guntur", localNames: "kaju barfi, కాజు కట్లి" });

test("M01 local search words built from the town and nearby places", () => {
  const k = keywordPack(local(), "Vijayawada");
  assert.ok(k.local.includes("kaju katli vijayawada"));
  assert.ok(k.local.includes("kaju katli in guntur"));
  assert.ok(k.local.includes("kaju katli near me"));
  assert.ok(k.local.includes("కాజు కట్లి"));
  assert.equal(k.areas[0], "Vijayawada");
});

test("M02 Amazon search terms: under 250 bytes even with Telugu, no brand, no title words", () => {
  const p = local();
  const k = keywordPack(p, "Vijayawada");
  assert.ok(bytes(k.amazonBackend) <= AMAZON_BACKEND_MAX, `${bytes(k.amazonBackend)} bytes`);
  const words = k.amazonBackend.split(" ");
  for (const w of ["sri", "lakshmi", "sweets", "kaju", "katli"]) assert.ok(!words.includes(w), `"${w}" should not be repeated`);
  assert.ok(words.includes("vijayawada"));
  assert.equal(new Set(words).size, words.length, "no repeated words");
});

test("M03 Amazon search terms: a long manual line is cut to fit, never over the limit", () => {
  const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
  const k = keywordPack(kaju({ manualSearch: { amazonBackend: long } }));
  assert.ok(k.manual.amazonBackend);
  assert.ok(bytes(k.amazonBackend) <= AMAZON_BACKEND_MAX);
  assert.ok(k.amazonBackend.startsWith("word0 word1"));
});

test("M04 manual ad and negative keywords replace the automatic ones", () => {
  const auto = keywordPack(local(), "Vijayawada");
  assert.ok(auto.adKeywords.length > 3 && auto.adKeywords.length <= 30);
  assert.ok(auto.negative.includes("recipe"));
  const k = keywordPack(kaju({ manualSearch: { adKeywords: "kaju katli online\nsweets vijayawada", negativeKeywords: "free sample" } }));
  assert.deepEqual(k.adKeywords, ["kaju katli online", "sweets vijayawada"]);
  assert.deepEqual(k.negative, ["free sample"]);
  assert.ok(k.manual.adKeywords && k.manual.negative);
});

test("M05 clearing a manual box goes back to automatic", () => {
  const k = keywordPack(kaju({ manualSearch: { adKeywords: "   " } }));
  assert.equal(k.manual.adKeywords, false);
  assert.ok(k.adKeywords.includes("kaju katli"));
});

test("M06 sales health: not live / just started / customers not coming / selling", () => {
  const now = Date.UTC(2026, 10, 21);
  const ord = (daysAgo: number, qty = 1) => ({ ts: now - daysAgo * DAY, qty });
  assert.equal(salesHealth({ liveSince: undefined }, [], now).verdict, "not_live");
  assert.equal(salesHealth({ liveSince: now - 2 * DAY }, [], now).verdict, "too_early");
  assert.equal(salesHealth({ liveSince: now - 3 * DAY }, [ord(1), ord(2)], now).verdict, "slow");
  assert.equal(salesHealth({ liveSince: now - 3 * DAY }, [ord(1), ord(2), ord(3)], now).verdict, "ok");
});

test("M07 sales health ignores orders older than 7 days and future-dated ones", () => {
  const now = Date.UTC(2026, 10, 21);
  const h = salesHealth({ liveSince: now - 30 * DAY }, [{ ts: now - 8 * DAY, qty: 5 }, { ts: now - 10 * DAY, qty: 5 }, { ts: now + DAY, qty: 9 }, { ts: now - DAY, qty: 2 }], now);
  assert.equal(h.orders7, 1); assert.equal(h.units7, 2); assert.equal(h.verdict, "slow");
});

test("M08 playbook: unique steps, every group filled, every step has steps to follow", () => {
  const t = playbookTasks(local(), { sellerName: "Sri Lakshmi Sweets", city: "Vijayawada", phone: "919876543210", where: ["Amazon", "Flipkart"] });
  assert.equal(new Set(t.map((x) => x.id)).size, t.length);
  for (const g of GROUPS) assert.ok(t.some((x) => x.group === g), `group ${g}`);
  for (const x of t) assert.ok(x.steps.length >= 2, `${x.id} has steps`);
});

test("M09 playbook messages carry the product, town, price and order places", () => {
  const p = local();
  const t = playbookTasks(p, { sellerName: "Sri Lakshmi Sweets", city: "Vijayawada", phone: "919876543210", where: ["Amazon", "Flipkart"] });
  const wa = t.find((x) => x.id === "wa-broadcast")!.copy!;
  assert.match(wa, /Kaju Katli/); assert.match(wa, /Rs 320/); assert.match(wa, /Amazon, Flipkart/); assert.match(wa, /wa\.me\/919876543210/); assert.match(wa, /STOP/);
  assert.match(t.find((x) => x.id === "gbp")!.copy!, /Vijayawada/);
  assert.equal(t.find((x) => x.id === "amz-terms")!.copy, keywordPack(p, "Vijayawada").amazonBackend);
  assert.match(t.find((x) => x.id === "amz-ads")!.copy!, /NEGATIVE:/);
});

test("M10 playbook works for a seller with no phone, town or channels yet", () => {
  const t = playbookTasks(kaju(), { sellerName: "Shop", city: "", where: [] });
  assert.ok(t.length > 10);
  for (const x of t) assert.ok(!/undefined|NaN/.test(`${x.title} ${x.why} ${x.copy ?? ""} ${x.steps.join(" ")}`), `${x.id} has no undefined/NaN`);
});
