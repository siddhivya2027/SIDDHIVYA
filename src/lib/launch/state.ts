"use client";
/** Store helpers for One-Click Launch. All writes go through here so every change is stamped and logged. */
import { CLIENTS } from "@/lib/demo/catalog";
import type { Client } from "@/lib/demo/types";
import { LIVE } from "@/lib/live/mode";
import { useStore } from "@/lib/store";
import { CHANNELS } from "./channels";
import type { AlertLog, ChannelId, LaunchProduct, PublishJob, SellerSetup } from "./types";

export const emptySetup = (): SellerSetup => ({ phone: "", telegramChatId: "", fssaiNumber: "", fssaiExpiry: "", gstin: "", pan: "", bankVerified: false, pickupPincode: "", accounts: {} });

export function saveLaunch(p: LaunchProduct) {
  const next = { ...p, updatedAt: Date.now() };
  useStore.setState((s) => ({ launches: [next, ...s.launches.filter((x) => x.id !== p.id)] }));
}
export function patchLaunch(id: string, fn: (p: LaunchProduct) => LaunchProduct) {
  useStore.setState((s) => ({ launches: s.launches.map((x) => (x.id === id ? { ...fn(x), updatedAt: Date.now() } : x)) }));
}
export function deleteLaunch(id: string) {
  useStore.setState((s) => ({ launches: s.launches.filter((x) => x.id !== id) }));
}
export function setJob(id: string, job: PublishJob) {
  patchLaunch(id, (p) => ({ ...p, jobs: { ...p.jobs, [job.channel]: job } }));
}
export function setSellerSetup(clientId: string, fn: (s: SellerSetup) => SellerSetup) {
  useStore.setState((st) => ({ sellerSetup: { ...st.sellerSetup, [clientId]: fn(st.sellerSetup[clientId] ?? emptySetup()) } }));
}
export function addAlertLog(e: Omit<AlertLog, "id" | "ts">) {
  useStore.setState((s) => ({ alertLog: [{ ...e, id: Math.random().toString(36).slice(2, 10), ts: Date.now() }, ...s.alertLog].slice(0, 200) }));
}
export const useLaunch = (id: string) => useStore((s) => s.launches.find((x) => x.id === id));
export const useSetup = (clientId: string) => useStore((s) => s.sellerSetup[clientId]);
export const isLive = (st?: PublishJob["state"]) => st === "live" || st === "demo_live" || st === "uploaded";
export const liveCount = (p: LaunchProduct) => CHANNELS.filter((c) => isLive(p.jobs[c.id as ChannelId]?.state)).length;

/** Sellers = the agency's clients (sample ones plus any added). */
export function useSellers(): Client[] {
  const custom = useStore((s) => s.customClients);
  return LIVE ? custom : [...CLIENTS, ...custom];
}
