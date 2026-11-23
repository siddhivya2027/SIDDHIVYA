"use client";
/**
 * Live mode: keeps the browser's working copy and the database in step.
 * - On sign-in it loads every document this login may see.
 * - Every change made on screen is saved automatically (about a second later), in small batches.
 * - Every 30 seconds (when nothing is waiting to be saved) it reloads, so changes from other people appear.
 */
import { toast } from "@/components/shared";
import type { Client } from "@/lib/demo/types";
import type { AlertLog, AlertRules, LaunchProduct, ManualOrder, OptIn, PlaybookState, SellerSetup, Settlement, VisibilityCheck } from "@/lib/launch/types";
import { useStore, type SiteLead } from "@/lib/store";

type Kind = "launch" | "seller" | "setup" | "optin" | "settlement" | "visibility" | "settings" | "alertlog" | "lead" | "manualorder" | "playbook";
interface Item { kind: Kind; id: string; clientId?: string | null; data: unknown }
interface RemoteDoc { kind: Kind; id: string; data: unknown; at: number }

type S = ReturnType<typeof useStore.getState>;
const ARRAYS: { slice: keyof S; kind: Kind; client: (x: never) => string | null }[] = [
  { slice: "launches", kind: "launch", client: (x: LaunchProduct) => x.clientId },
  { slice: "customClients", kind: "seller", client: (x: Client) => x.id },
  { slice: "optIns", kind: "optin", client: (x: OptIn) => x.clientId },
  { slice: "settlements", kind: "settlement", client: (x: Settlement) => x.clientId },
  { slice: "visibility", kind: "visibility", client: () => null },
  { slice: "alertLog", kind: "alertlog", client: () => null },
  { slice: "manualOrders", kind: "manualorder", client: (x: ManualOrder) => x.clientId },
  { slice: "playbook", kind: "playbook", client: (x: PlaybookState) => x.clientId },
] as never;

let applying = false;
let started = false;
let canWrite = false;
const upserts = new Map<string, Item>();
const deletes = new Map<string, { kind: Kind; id: string }>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let failedOnce = false;

function queueUp(i: Item) { const k = `${i.kind}:${i.id}`; deletes.delete(k); upserts.set(k, i); schedule(); }
function queueDel(kind: Kind, id: string) { const k = `${kind}:${id}`; upserts.delete(k); deletes.set(k, { kind, id }); schedule(); }
function schedule(ms = 900) { if (timer) clearTimeout(timer); timer = setTimeout(() => void flush(), ms); }
export const pendingChanges = () => upserts.size + deletes.size + (inFlight ? 1 : 0);

async function flush() {
  if (inFlight || (!upserts.size && !deletes.size)) return;
  inFlight = true;
  // Batches of up to ~2.5 MB so photo-heavy products stay under the server's request limit.
  const ups = [...upserts.values()]; const dels = [...deletes.values()];
  upserts.clear(); deletes.clear();
  const batches: { upserts: Item[]; deletes: typeof dels }[] = [];
  let cur: Item[] = [], size = 0;
  for (const u of ups) {
    const n = JSON.stringify(u.data).length;
    if (cur.length && size + n > 2_500_000) { batches.push({ upserts: cur, deletes: [] }); cur = []; size = 0; }
    cur.push(u); size += n;
  }
  batches.push({ upserts: cur, deletes: dels });
  try {
    for (const b of batches) {
      if (!b.upserts.length && !b.deletes.length) continue;
      const res = await fetch("/api/v1/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error || `Save failed (${res.status})`);
    }
    failedOnce = false;
  } catch (e) {
    // Put everything back and try again shortly; tell the user once.
    for (const u of ups) if (!upserts.has(`${u.kind}:${u.id}`)) upserts.set(`${u.kind}:${u.id}`, u);
    for (const d of dels) if (!upserts.has(`${d.kind}:${d.id}`)) deletes.set(`${d.kind}:${d.id}`, d);
    if (!failedOnce) toast(`Not saved yet — ${e instanceof Error ? e.message : "no connection"}. Retrying…`, "error");
    failedOnce = true;
    schedule(5000);
  } finally { inFlight = false; }
}

/** Loads everything this login may see into the app. */
export async function pull(): Promise<boolean> {
  const res = await fetch("/api/v1/data", { cache: "no-store" });
  if (!res.ok) return false;
  const { docs } = (await res.json()) as { docs: RemoteDoc[] };
  const by = (k: Kind) => docs.filter((d) => d.kind === k).sort((a, b) => b.at - a.at).map((d) => d.data);
  const setup: Record<string, SellerSetup> = {};
  for (const d of docs) if (d.kind === "setup") setup[d.id] = d.data as SellerSetup;
  const rules = docs.find((d) => d.kind === "settings" && d.id === "alertRules")?.data as AlertRules | undefined;
  applying = true;
  try {
    useStore.setState((s) => ({
      launches: by("launch") as LaunchProduct[],
      customClients: by("seller") as Client[],
      sellerSetup: setup,
      optIns: by("optin") as OptIn[],
      settlements: by("settlement") as Settlement[],
      visibility: by("visibility") as VisibilityCheck[],
      alertLog: (by("alertlog") as AlertLog[]).sort((a, b) => b.ts - a.ts).slice(0, 200),
      manualOrders: by("manualorder") as ManualOrder[],
      playbook: by("playbook") as PlaybookState[],
      siteLeads: (by("lead") as SiteLead[]).sort((a, b) => b.ts - a.ts),
      alertRules: rules ?? s.alertRules,
      clientId: s.clientId && (by("seller") as Client[]).some((c) => c.id === s.clientId) ? s.clientId : ((by("seller") as Client[])[0]?.id ?? ""),
    }));
  } finally { applying = false; }
  return true;
}

function diff(prev: S, next: S) {
  for (const a of ARRAYS) {
    const p = prev[a.slice] as unknown as { id: string }[], n = next[a.slice] as unknown as { id: string }[];
    if (p === n) continue;
    const before = new Map(p.map((x) => [x.id, x]));
    for (const x of n) if (before.get(x.id) !== x) queueUp({ kind: a.kind, id: x.id, clientId: a.client(x as never), data: x });
    const now = new Set(n.map((x) => x.id));
    for (const x of p) if (!now.has(x.id)) queueDel(a.kind, x.id);
  }
  if (prev.sellerSetup !== next.sellerSetup) {
    for (const [id, v] of Object.entries(next.sellerSetup)) if (prev.sellerSetup[id] !== v) queueUp({ kind: "setup", id, clientId: id, data: v });
  }
  if (prev.alertRules !== next.alertRules) queueUp({ kind: "settings", id: "alertRules", clientId: null, data: next.alertRules });
}

/** Starts syncing after sign-in. Staff logins save changes; seller logins only read. */
export async function startSync(write: boolean) {
  canWrite = write;
  await pull();
  if (started) return;
  started = true;
  useStore.subscribe((next, prev) => { if (!applying && canWrite) diff(prev, next); });
  const tick = () => { if (!pendingChanges() && document.visibilityState === "visible") void pull(); };
  setInterval(tick, 30_000);
  window.addEventListener("focus", tick);
  window.addEventListener("beforeunload", (e) => { if (pendingChanges()) { void flush(); e.preventDefault(); } });
}
