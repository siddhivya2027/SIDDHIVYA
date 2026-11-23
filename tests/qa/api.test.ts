/**
 * End-to-end checks of the real API routes with an in-memory database:
 * first owner, logins, roles, what sellers can and cannot see or do, keys, orders, approvals, morning job.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { cookieOf, req, useFakeDb, type FakeDb } from "./fake-db";
import { SERVICES } from "@/lib/site/leads";

let db: FakeDb;
let owner = "", manager = "", seller = "", seller2 = "";
let sellerPw = "";
const R = async <T = Record<string, unknown>>(p: Promise<Response>) => { const r = await p; return { status: r.status, body: (await r.json()) as T, res: r }; };

before(() => { db = useFakeDb(); });

test("A01 /api/auth/me before anyone exists: owner setup needed", async () => {
  const { GET } = await import("@/app/api/auth/me/route");
  const r = await R<{ db: boolean; setupNeeded: boolean }>(GET(req("/api/auth/me")));
  assert.equal(r.body.db, true); assert.equal(r.body.setupNeeded, true);
});

test("A02 owner setup: weak password refused; first owner created; second setup refused", async () => {
  const { POST } = await import("@/app/api/auth/setup/route");
  assert.equal((await R(POST(req("/api/auth/setup", { body: { name: "Boss", email: "siddhivya2027@gmail.com", password: "short" } })))).status, 422);
  const ok = await R(POST(req("/api/auth/setup", { body: { name: "Boss", email: "SIDDHIVYA2027@gmail.com", password: "a-strong-password-1" } })));
  assert.equal(ok.status, 200); owner = cookieOf(ok.res); assert.match(owner, /^sv_session=/);
  const u = [...db.user.rows.values()][0];
  assert.equal(u.email, "siddhivya2027@gmail.com", "email stored lower-case"); assert.equal(u.role, "owner");
  assert.ok(!String(u.passwordHash).includes("strong"), "password not stored in plain text");
  assert.equal((await R(POST(req("/api/auth/setup", { body: { name: "Hacker", email: "x@y.com", password: "another-password-1" } })))).status, 409);
});

test("A03 login: wrong password and unknown email get the same answer", async () => {
  const { POST } = await import("@/app/api/auth/login/route");
  const a = await R<{ error: string }>(POST(req("/api/auth/login", { body: { email: "siddhivya2027@gmail.com", password: "wrong" } })));
  const b = await R<{ error: string }>(POST(req("/api/auth/login", { body: { email: "nobody@x.com", password: "wrong" } })));
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.body.error, b.body.error);
  const ok = await R(POST(req("/api/auth/login", { body: { email: "siddhivya2027@gmail.com", password: "a-strong-password-1" } })));
  assert.equal(ok.status, 200); assert.match(cookieOf(ok.res), /^sv_session=/);
});

test("A04 a forged or expired cookie is not accepted", async () => {
  const { GET } = await import("@/app/api/v1/users/route");
  const forged = owner.replace(/\.[\w-]+$/, ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  assert.equal((await GET(req("/api/v1/users", { cookie: forged }))).status, 401);
  const [, v] = owner.split("="); const [uid] = v.split(".");
  assert.equal((await GET(req("/api/v1/users", { cookie: `sv_session=${uid}.1000.sig` }))).status, 401);
  assert.equal((await GET(req("/api/v1/users"))).status, 401, "no cookie");
});

test("A05 owner adds a team member and a seller login (temporary password, must change)", async () => {
  const { POST } = await import("@/app/api/v1/users/route");
  const { POST: login } = await import("@/app/api/auth/login/route");
  const m = await R<{ tempPassword: string }>(POST(req("/api/v1/users", { cookie: owner, body: { name: "Shalini L", email: "shalini@example.com", role: "manager" } })));
  assert.equal(m.status, 200); assert.equal(m.body.tempPassword.length, 10);
  manager = cookieOf((await R(login(req("/x", { body: { email: "shalini@example.com", password: m.body.tempPassword } })))).res);
  assert.equal((await R(POST(req("/api/v1/users", { cookie: owner, body: { name: "No Shop", email: "ns@example.com", role: "seller" } })))).status, 422, "seller login needs a seller");
  const s = await R<{ tempPassword: string }>(POST(req("/api/v1/users", { cookie: owner, body: { name: "Lakshmi", email: "lakshmi@example.com", role: "seller", clientId: "seller-1" } })));
  sellerPw = s.body.tempPassword;
  const sl = await R<{ mustChange: boolean }>(login(req("/x", { body: { email: "lakshmi@example.com", password: sellerPw } })));
  assert.equal(sl.body.mustChange, true); seller = cookieOf(sl.res);
  const s2 = await R<{ tempPassword: string }>(POST(req("/api/v1/users", { cookie: owner, body: { name: "Other", email: "other@example.com", role: "seller", clientId: "seller-2" } })));
  seller2 = cookieOf((await R(login(req("/x", { body: { email: "other@example.com", password: s2.body.tempPassword } })))).res);
  assert.equal((await R(POST(req("/api/v1/users", { cookie: owner, body: { name: "Dup", email: "LAKSHMI@example.com", role: "manager" } })))).status, 409, "same email twice");
});

test("A06 sellers cannot manage logins, save data, keys, publish or fetch orders", async () => {
  const users = await import("@/app/api/v1/users/route");
  const data = await import("@/app/api/v1/data/route");
  const conn = await import("@/app/api/v1/connections/route");
  const pub = await import("@/app/api/v1/publish/route");
  const sync = await import("@/app/api/v1/orders/sync/route");
  assert.equal((await users.GET(req("/u", { cookie: seller }))).status, 403);
  assert.equal((await users.POST(req("/u", { cookie: seller, body: { name: "Me Boss", email: "me@x.com", role: "manager" } }))).status, 403);
  assert.equal((await data.POST(req("/d", { cookie: seller, body: { upserts: [{ kind: "launch", id: "X", clientId: "seller-1", data: {} }] } }))).status, 403);
  assert.equal((await conn.GET(req("/c?clientId=seller-1", { cookie: seller }))).status, 403);
  assert.equal((await conn.POST(req("/c", { cookie: seller, body: { clientId: "seller-1", channel: "amazon", values: { AMAZON_SELLER_ID: "A1" } } }))).status, 403);
  const body = { channel: "facebook", clientId: "seller-1", listing: { title: "Kaju", bullets: [], description: "d", price: 320, stock: 1 }, product: { name: "Kaju", brand: "B", sku: "S", size: "250 g", mrp: 360, weightGrams: 300 } };
  assert.equal((await pub.POST(req("/p", { cookie: seller, body }))).status, 403);
  assert.equal((await sync.POST(req("/s", { cookie: seller, body: {} }))).status, 403);
});

test("A07 team saves data; each seller sees only their own products, orders and seller record", async () => {
  const data = await import("@/app/api/v1/data/route");
  const up = (kind: string, id: string, clientId: string | null, d: unknown = { id }) => ({ kind, id, clientId, data: d });
  const save = await R(data.POST(req("/d", { cookie: manager, body: { upserts: [
    up("launch", "L1", "seller-1", { id: "L1", clientId: "seller-1", name: "Kaju Katli", approval: { state: "sent" } }), up("launch", "L2", "seller-2"),
    up("seller", "seller-1", "seller-1"), up("seller", "seller-2", "seller-2"),
    up("setup", "seller-1", "seller-1", { fssaiNumber: "SECRET-FSSAI" }), up("manualorder", "H-1", "seller-1"), up("manualorder", "H-2", "seller-2"),
    up("playbook", "L1", "seller-1"), up("lead", "W-1", null), up("settings", "alertRules", null),
  ] } })));
  assert.equal(save.status, 200);
  const mine = await R<{ docs: { kind: string; id: string }[] }>(data.GET(req("/d", { cookie: seller })));
  const ids = mine.body.docs.map((d) => `${d.kind}:${d.id}`).sort();
  assert.deepEqual(ids, ["launch:L1", "manualorder:H-1", "seller:seller-1"]);
  assert.ok(!JSON.stringify(mine.body).includes("SECRET-FSSAI"));
  const team = await R<{ docs: unknown[] }>(data.GET(req("/d", { cookie: manager })));
  assert.equal(team.body.docs.length, 10);
});

test("A08 seller approves their own product in the app; cannot touch another seller's", async () => {
  const { POST } = await import("@/app/api/v1/approvals/self/route");
  const no = await R(POST(req("/a", { cookie: seller2, body: { lid: "L1", decision: "approved" } })));
  assert.equal(no.status, 404);
  assert.equal((await R(POST(req("/a", { cookie: manager, body: { lid: "L1", decision: "approved" } })))).status, 403, "only the seller approves here");
  const ok = await R<{ receipt: string; launch: { approval: { state: string; by: string } } }>(POST(req("/a", { cookie: seller, body: { lid: "L1", decision: "approved" } })));
  assert.equal(ok.status, 200); assert.equal(ok.body.launch.approval.state, "approved"); assert.equal(ok.body.launch.approval.by, "Lakshmi");
  const doc = await db.doc.findUnique({ where: { kind_id: { kind: "launch", id: "L1" } } });
  assert.equal((doc!.data as { approval: { state: string } }).approval.state, "approved", "written to the database");
});

test("A09 seller keys: saved locked, only names come back, removing works, wrong key names refused", async () => {
  const conn = await import("@/app/api/v1/connections/route");
  const bad = await R(conn.POST(req("/c", { cookie: manager, body: { clientId: "seller-1", channel: "amazon", values: { META_PAGE_TOKEN: "x" } } })));
  assert.equal(bad.status, 422);
  const ok = await R(conn.POST(req("/c", { cookie: manager, body: { clientId: "seller-1", channel: "facebook", values: { META_PAGE_ID: "12345", META_PAGE_TOKEN: "EAAG-very-secret" } } })));
  assert.equal(ok.status, 200);
  const row = [...db.secret.rows.values()][0];
  assert.ok(!String(row.sealed).includes("very-secret"), "stored encrypted");
  const g = await R<{ channels: Record<string, { saved: string[]; configured: boolean }> }>(conn.GET(req("/c?clientId=seller-1", { cookie: manager })));
  assert.deepEqual(g.body.channels.facebook.saved.sort(), ["META_PAGE_ID", "META_PAGE_TOKEN"]);
  assert.equal(g.body.channels.facebook.configured, true);
  assert.ok(!JSON.stringify(g.body).includes("very-secret"), "values never returned");
  const other = await R<{ channels: Record<string, { configured: boolean }> }>(conn.GET(req("/c?clientId=seller-2", { cookie: manager })));
  assert.equal(other.body.channels.facebook.configured, false, "keys belong to one seller only");
  await R(conn.POST(req("/c", { cookie: manager, body: { clientId: "seller-1", channel: "facebook", values: { META_PAGE_TOKEN: "" } } })));
  const after = await R<{ channels: Record<string, { saved: string[] }> }>(conn.GET(req("/c?clientId=seller-1", { cookie: manager })));
  assert.deepEqual(after.body.channels.facebook.saved, ["META_PAGE_ID"]);
});

test("A10 publish with missing keys says exactly which keys, without calling the app", async () => {
  const { POST } = await import("@/app/api/v1/publish/route");
  const body = { channel: "instagram", clientId: "seller-2", listing: { title: "Kaju", bullets: [], description: "d", price: 320, stock: 1 }, product: { name: "Kaju", brand: "B", sku: "S", size: "250 g", mrp: 360, weightGrams: 300 } };
  const r = await R<{ state: string; missing: string[] }>(POST(req("/p", { cookie: manager, body })));
  assert.equal(r.body.state, "needs_connection"); assert.deepEqual(r.body.missing, ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID"]);
  const noSeller = await R(POST(req("/p", { cookie: manager, body: { ...body, clientId: undefined } })));
  assert.equal(noSeller.status, 422);
  const badPrice = await R(POST(req("/p", { cookie: manager, body: { ...body, listing: { ...body.listing, price: -5 } } })));
  assert.equal(badPrice.status, 422);
});

test("A11 orders: sellers only get their own", async () => {
  await db.order.create({ data: { id: "amazon:1", clientId: "seller-1", channel: "amazon", orderId: "1", ts: new Date(), status: "Shipped", qty: 1, sale: 320, sku: "SLS" } });
  await db.order.create({ data: { id: "amazon:2", clientId: "seller-2", channel: "amazon", orderId: "2", ts: new Date(), status: "Shipped", qty: 1, sale: 99, sku: "X" } });
  const { GET } = await import("@/app/api/v1/orders/route");
  const s = await R<{ orders: { clientId: string }[] }>(GET(req("/o?clientId=seller-2", { cookie: seller })));
  assert.deepEqual(s.body.orders.map((o) => o.clientId), ["seller-1"], "ignores ?clientId= for sellers");
  const t = await R<{ orders: unknown[] }>(GET(req("/o", { cookie: manager })));
  assert.equal(t.body.orders.length, 2);
});

test("A12 switched-off login stops working at once; owner can't be switched off by a manager", async () => {
  const one = await import("@/app/api/v1/users/[id]/route");
  const users = await import("@/app/api/v1/users/route");
  const sid = [...db.user.rows.values()].find((u) => u.email === "other@example.com")!.id as string;
  const oid = [...db.user.rows.values()].find((u) => u.role === "owner")!.id as string;
  assert.equal((await one.PATCH(req("/u", { cookie: manager, body: { action: "deactivate" } }), { params: Promise.resolve({ id: oid }) })).status, 403);
  assert.equal((await one.PATCH(req("/u", { cookie: owner, body: { action: "deactivate" } }), { params: Promise.resolve({ id: oid }) })).status, 422, "can't switch off yourself");
  assert.equal((await one.PATCH(req("/u", { cookie: owner, body: { action: "deactivate" } }), { params: Promise.resolve({ id: sid }) })).status, 200);
  const { GET } = await import("@/app/api/v1/orders/route");
  assert.equal((await GET(req("/o", { cookie: seller2 }))).status, 401);
  assert.equal((await users.GET(req("/u", { cookie: owner }))).status, 200);
});

test("A13 morning job: refuses without the secret; runs and sends nothing when Telegram is off", async () => {
  const { GET } = await import("@/app/api/cron/daily/route");
  assert.equal((await GET(req("/api/cron/daily"))).status, 401);
  assert.equal((await GET(req("/api/cron/daily", { headers: { authorization: "Bearer wrong-secret-wrong-secret" } }))).status, 401);
  const ok = await R<{ ok: boolean; orders: Record<string, string> }>(GET(req("/api/cron/daily", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })));
  assert.equal(ok.status, 200); assert.equal(ok.body.ok, true);
  assert.match(ok.body.orders["seller-1"], /not added/i, "Amazon not connected is reported, not crashed");
});

test("A14 website leads are saved to the database", async () => {
  const { POST } = await import("@/app/api/v1/leads/route");
  const before = (await db.doc.findMany({ where: { kind: "lead" } })).length;
  const r = await POST(req("/l", { body: { kind: "enquiry", name: "Ravi Kumar", phone: "9876543210", email: "ravi@example.com", agency: "Ravi Sweets", interest: SERVICES[0], message: "Want to sell on Amazon", consent: true, website: "" } }));
  assert.ok(r.status < 300, `status ${r.status}: ${await r.clone().text()}`);
  assert.equal((await db.doc.findMany({ where: { kind: "lead" } })).length, before + 1);
});
