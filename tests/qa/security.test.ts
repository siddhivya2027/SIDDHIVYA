import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, hashPassword, sessionCookie, tempPassword } from "@/server/auth";
import { checkReceipt, readToken, receiptFor, signSummary, type ApprovalSummary } from "@/server/launch/approvals";
import { open, seal } from "@/server/connectors/token-vault";
import { KINDS, SELLER_READABLE } from "@/server/live/docs";

process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef";
process.env.APPROVAL_SECRET = "test-approval-secret-0123456789abc";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test("S01 passwords are stored scrambled (scrypt) and checked correctly", async () => {
  const h = await hashPassword("Kaju@Katli2026");
  assert.match(h, /^scrypt\$/); assert.ok(!h.includes("Kaju"));
  assert.equal(await checkPassword("Kaju@Katli2026", h), true);
  assert.equal(await checkPassword("kaju@katli2026", h), false);
  assert.notEqual(await hashPassword("same"), await hashPassword("same"), "salted");
  assert.equal(await checkPassword("x", "plain-text"), false);
});

test("S02 temporary passwords: 10 characters, no look-alike letters, all different", () => {
  const set = new Set(Array.from({ length: 200 }, tempPassword));
  assert.equal(set.size, 200);
  for (const p of set) { assert.equal(p.length, 10); assert.ok(!/[0O1lI]/.test(p)); }
});

test("S03 login cookie: HttpOnly, SameSite, 14 days, signed", () => {
  const c = sessionCookie("u1");
  assert.match(c, /^sv_session=u1\.\d+\.[\w-]+;/); assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Lax/); assert.match(c, /Max-Age=1209600/);
});

test("S04 seller keys locked with AES-256-GCM; tampering or a wrong key fails", () => {
  const s = seal('{"AMAZON_SP_REFRESH_TOKEN":"Atzr|secret"}');
  assert.ok(!s.includes("secret")); assert.match(s, /^v1\./);
  assert.equal(open(s), '{"AMAZON_SP_REFRESH_TOKEN":"Atzr|secret"}');
  assert.notEqual(seal("x"), seal("x"), "random IV each time");
  const parts = s.split("."); parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
  assert.throws(() => open(parts.join(".")));
  const keep = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  assert.throws(() => open(s));
  process.env.TOKEN_ENCRYPTION_KEY = keep;
});

const sum = (o: Partial<ApprovalSummary> = {}): ApprovalSummary => ({ v: 1, lid: "L1", seller: "Sri Lakshmi Sweets", agency: "SIDDHIVYA", agencyPhone: "91", product: "Kaju Katli", size: "250 g", price: 320, stock: 100, channels: [], adsPerDay: 500, exp: Date.now() + 86400000, ...o });

test("S05 approval link: signed, can't be changed, expires", () => {
  const t = signSummary(sum());
  const r = readToken(t); assert.equal(r.ok, true); if (r.ok) { assert.equal(r.signed, true); assert.equal(r.sum.price, 320); }
  const [body, sig] = t.split(".");
  const cheaper = Buffer.from(JSON.stringify({ ...sum(), price: 1 })).toString("base64url");
  assert.equal(readToken(`${cheaper}.${sig}`).ok, false, "changed price is rejected");
  assert.equal(readToken(body).ok, false, "missing signature is rejected");
  assert.equal(readToken(signSummary(sum({ exp: Date.now() - 1 }))).ok, false, "expired link is rejected");
});

test("S06 approval receipt code proves the decision came through the server", () => {
  const t = signSummary(sum());
  const r = receiptFor(t, "approved");
  assert.match(r, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(checkReceipt(t, "approved", r.toLowerCase()), true);
  assert.equal(checkReceipt(t, "changes", r), false);
});

test("S07 sellers can never read setup (FSSAI/GST/phone), playbook, settings, leads or logs", () => {
  for (const k of ["setup", "settings", "alertlog", "lead", "playbook", "optin", "visibility"]) assert.ok(!SELLER_READABLE.includes(k as never), k);
  for (const k of ["manualorder", "playbook"]) assert.ok(KINDS.includes(k as never), `${k} is stored`);
});
