import "server-only";

/** Kinds of documents the app stores, and which ones a seller login may read (only their own). */
export const KINDS = ["launch", "seller", "setup", "optin", "settlement", "visibility", "settings", "alertlog", "lead", "manualorder", "playbook"] as const;
export type Kind = (typeof KINDS)[number];
export const SELLER_READABLE: Kind[] = ["launch", "seller", "settlement", "manualorder"];
export const isKind = (k: string): k is Kind => (KINDS as readonly string[]).includes(k);
