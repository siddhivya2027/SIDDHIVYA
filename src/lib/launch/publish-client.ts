"use client";
/**
 * THE ONE CLICK. Sends an approved product to every channel switched on for it, one after another, and records
 * what each channel answered. API channels go through /api/v1/publish; sheet channels download their upload file.
 * In demo mode, a channel whose keys are not set yet can be shown as "Demo live" (clearly marked) so the full
 * flow can be presented — nothing is claimed as sent.
 */
import { useStore } from "@/lib/store";
import { CH } from "./channels";
import { marketplaceNames } from "./engine";
import { channelSheet, download, downloadPhotos, merchantFeed, searchPack } from "./files";
import { addAlertLog, patchLaunch, setJob } from "./state";
import type { ChannelId, LaunchProduct, PublishJob } from "./types";

export interface ChannelStatus { demoMode: boolean; signedApprovals: boolean; channels: Record<string, { configured: boolean; missing: string[] }> }
export async function fetchChannelStatus(clientId?: string): Promise<ChannelStatus | null> {
  try { const r = await fetch(`/api/v1/channels${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
}

const job = (channel: ChannelId, state: PublishJob["state"], message: string, extra: Partial<PublishJob> = {}): PublishJob => ({ channel, state, message, ts: Date.now(), ...extra });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function notifyTelegram(text: string, chatId?: string) {
  try {
    const r = await fetch("/api/v1/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, chatId: chatId || "" }) });
    const j = (await r.json()) as { state: "sent" | "pending_configuration" | "failed" };
    addAlertLog({ to: chatId || "Agency team", text, status: j.state });
    return j.state;
  } catch {
    addAlertLog({ to: chatId || "Agency team", text, status: "failed" });
    return "failed" as const;
  }
}

export async function publishEverywhere(p: LaunchProduct, opts: { simulate: boolean; city: string; siteUrl: string; only?: ChannelId[] }) {
  const st = useStore.getState();
  const setup = st.sellerSetup[p.clientId];
  const recipients = st.optIns.filter((o) => o.clientId === p.clientId).map((o) => ({ name: o.name, phone: o.phone }));
  const where = marketplaceNames(p);
  const image = p.banner || p.photos[0]?.src;
  const targets = p.listings.filter((l) => l.enabled && (!opts.only || opts.only.includes(l.channel)));
  let photosDone = false;

  for (const l of targets) {
    const info = CH[l.channel];
    setJob(p.id, job(l.channel, "sending", "Sending…"));
    await wait(250);
    if (info.delivery === "sheet") {
      if (l.channel === "google") {
        download(merchantFeed([p], opts.siteUrl), `${p.sku || p.id}-google-merchant-feed.tsv`, "text/tab-separated-values");
        download(searchPack(p, opts.city, opts.siteUrl), `${p.sku || p.id}-search-pack.txt`);
        setJob(p.id, job(l.channel, "needs_upload", "Feed and search pack downloaded. Upload the feed in Merchant Center and add the search pack to the seller's page."));
      } else {
        const sheet = channelSheet(p, l.channel, setup);
        download(sheet.csv, sheet.name, "text/csv");
        if (!photosDone) { downloadPhotos(p); photosDone = true; }
        setJob(p.id, job(l.channel, "needs_upload", `${info.label} upload sheet and photos downloaded. Upload them in the ${info.label} portal, then mark it uploaded.`));
      }
      continue;
    }
    try {
      const res = await fetch("/api/v1/publish", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: l.channel,
          clientId: p.clientId,
          listing: { title: l.title, bullets: l.bullets, description: l.description, price: l.price, stock: l.stock },
          product: { name: p.name, brand: p.brand, sku: p.sku, size: p.size, mrp: p.mrp, weightGrams: p.weightGrams, amazonProductType: p.amazonProductType, flipkartFsn: p.flipkartFsn },
          image: info.kind === "social" ? image : undefined,
          recipients: l.channel === "whatsapp" ? recipients : undefined,
        }),
      });
      const r = (await res.json()) as { state: "live" | "needs_connection" | "failed"; message: string; url?: string; externalId?: string };
      if (r.state === "needs_connection" && opts.simulate) setJob(p.id, job(l.channel, "demo_live", `Demo — not really sent. ${r.message}`));
      else setJob(p.id, job(l.channel, r.state, r.message, { url: r.url, externalId: r.externalId }));
    } catch {
      setJob(p.id, job(l.channel, "failed", "Could not reach the server. Check the internet connection and try again."));
    }
  }

  const after = useStore.getState().launches.find((x) => x.id === p.id);
  const live = after ? Object.values(after.jobs).filter((j) => j && (j.state === "live" || j.state === "demo_live")).length : 0;
  if (live && !after?.liveSince) patchLaunch(p.id, (x) => ({ ...x, liveSince: Date.now() }));
  st.log("Published with one click", `${p.name} → ${targets.length} channels`);
  if (st.alertRules.onApproval) {
    const lines = after ? targets.map((l) => `• ${CH[l.channel].label}: ${after.jobs[l.channel]?.message ?? ""}`).join("\n") : "";
    void notifyTelegram(`🚀 ${p.brand} ${p.name} sent to ${targets.length} channels.\n${lines}`.slice(0, 3900));
  }
  return where;
}
