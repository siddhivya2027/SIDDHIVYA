/**
 * A tiny in-memory stand-in for the Prisma client, so the real API routes (logins, roles, data, approvals,
 * keys, orders, cron) can be tested end-to-end without a database. Supports only what the routes use.
 */
type Row = Record<string, unknown>;
const match = (r: Row, w: Row | undefined): boolean => {
  if (!w) return true;
  return Object.entries(w).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((x) => match(r, x));
    if (k === "kind_id") { const c = v as Row; return r.kind === c.kind && r.id === c.id; }
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const o = v as Row;
      if ("in" in o) return (o.in as unknown[]).includes(r[k]);
      if ("gte" in o) return (r[k] as Date) >= (o.gte as Date);
    }
    return r[k] === v;
  });
};
function table(key: (r: Row) => string, defaults: (r: Row) => Row = () => ({})) {
  const rows = new Map<string, Row>();
  const t = {
    rows,
    async findUnique({ where }: { where: Row }) { return [...rows.values()].find((r) => match(r, where)) ?? null; },
    async findMany(a: { where?: Row; take?: number } = {}) { return [...rows.values()].filter((r) => match(r, a.where)).slice(0, a.take ?? 1e9); },
    async count(a: { where?: Row } = {}) { return [...rows.values()].filter((r) => match(r, a.where)).length; },
    async create({ data }: { data: Row }) { const r = { ...defaults(data), ...data }; rows.set(key(r), r); return r; },
    async update({ where, data }: { where: Row; data: Row }) { const r = await t.findUnique({ where }); if (!r) throw new Error("not found"); Object.assign(r, data, { updatedAt: new Date() }); return r; },
    async upsert({ where, create, update }: { where: Row; create: Row; update: Row }) { const r = await t.findUnique({ where }); if (r) { Object.assign(r, update, { updatedAt: new Date() }); return r; } return t.create({ data: create }); },
    async deleteMany({ where }: { where: Row }) { let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.delete(k); n++; } return { count: n }; },
  };
  return t;
}
let n = 0;
export function makeFakeDb() {
  const now = () => new Date();
  return {
    user: table((r) => r.id as string, () => ({ id: `u${++n}`, active: true, mustChange: false, clientId: null, createdAt: now(), lastLoginAt: null })),
    doc: table((r) => `${r.kind}:${r.id}`, () => ({ updatedAt: now(), clientId: null })),
    secret: table((r) => r.id as string, () => ({ updatedAt: now() })),
    order: table((r) => r.id as string),
    auditLog: table(() => `a${++n}`),
    async $transaction(ops: Promise<unknown>[]) { return Promise.all(ops); },
  };
}
export type FakeDb = ReturnType<typeof makeFakeDb>;

/** Turns on "live mode with a database" for the routes and installs the fake. */
export function useFakeDb(): FakeDb {
  process.env.DATABASE_URL = "postgres://fake";
  process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef";
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.CRON_SECRET = "test-cron-secret-0123456789";
  const fake = makeFakeDb();
  (globalThis as { __prisma?: unknown }).__prisma = fake;
  return fake;
}

let ip = 0;
/** A request from a fresh IP (so rate limits don't interfere), optionally signed in. */
export function req(path: string, init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
  const h: Record<string, string> = { "x-forwarded-for": `10.0.${Math.floor(++ip / 250)}.${ip % 250}`, ...(init.headers ?? {}) };
  if (init.body !== undefined) h["content-type"] = "application/json";
  if (init.cookie) h.cookie = init.cookie;
  return new Request(`https://siddhivya.test${path}`, { method: init.method ?? (init.body !== undefined ? "POST" : "GET"), headers: h, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
}
/** "sv_session=…" from a Set-Cookie header. */
export const cookieOf = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0];
