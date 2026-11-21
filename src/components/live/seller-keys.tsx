"use client";
import { KeyRound, Lock } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/shared";
import { Badge, Button, Card, CardHeader, Field, Input, Modal } from "@/components/ui";

type Ch = "amazon" | "flipkart" | "facebook" | "instagram" | "whatsapp" | "telegram";
interface Info { keys: string[]; saved: string[]; savedAt: string | null; fromServer: string[]; configured: boolean; missing: string[] }
const LABEL: Record<Ch, string> = { amazon: "Amazon (Seller Central → Develop apps)", flipkart: "Flipkart (Seller API)", facebook: "Facebook Page", instagram: "Instagram business account", whatsapp: "WhatsApp Business (Cloud API)", telegram: "Telegram bot (seller's own alerts)" };
const HINT: Record<string, string> = {
  AMAZON_SELLER_ID: "Merchant token, e.g. A1B2C3D4E5", AMAZON_SP_REFRESH_TOKEN: "Starts with Atzr|", META_PAGE_TOKEN: "Long-lived Page access token", META_PAGE_ID: "Numbers only", META_IG_USER_ID: "Instagram business account ID (numbers)",
  WHATSAPP_TEMPLATE: "Approved template name, e.g. new_product_offer", WHATSAPP_TEMPLATE_LANG: "en or te or ta", FLIPKART_LOCATION_ID: "Pickup location ID from Seller Hub", TELEGRAM_CHAT_ID: "Optional",
};

/** Lets the team save one seller's own channel keys. Values go to the server, get locked, and are never shown again. */
export function SellerKeys({ clientId, sellerName, onSaved }: { clientId: string; sellerName: string; onSaved: () => void }) {
  const [data, setData] = React.useState<{ canSave: boolean; channels: Record<Ch, Info> } | null>(null);
  const [open, setOpen] = React.useState<Ch | null>(null);
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    const r = await fetch(`/api/v1/connections?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, [clientId]);
  React.useEffect(() => { void load(); }, [load]);
  const save = async (clear?: string) => {
    if (!open) return;
    setBusy(true);
    try {
      const values = clear ? { [clear]: "" } : Object.fromEntries(Object.entries(vals).filter(([, v]) => String(v).trim()));
      if (!Object.keys(values).length) { toast("Type at least one key.", "error"); return; }
      const r = await fetch("/api/v1/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId, channel: open, values }) });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) { toast(j.error || "Could not save.", "error"); return; }
      toast(clear ? "Key removed." : "Saved and locked."); setVals({}); if (!clear) setOpen(null); await load(); onSaved();
    } finally { setBusy(false); }
  };
  const chs = Object.keys(LABEL) as Ch[];
  const cur = open && data ? data.channels[open] : null;
  return (
    <Card className="mt-4">
      <CardHeader title={`${sellerName}'s own account keys`} subtitle="Each seller sells from their own Amazon, Flipkart, Facebook and WhatsApp accounts. Paste their keys here once — they are locked (encrypted) on the server and never shown again, not even to you." />
      {!data ? <p className="px-5 pb-5 text-[13px] text-muted">Loading…</p> : (
        <>
          {!data.canSave && <p className="mx-5 mb-3 rounded-lg bg-warn/10 px-3 py-2 text-[12.5px] text-warn">TOKEN_ENCRYPTION_KEY is not set in Vercel yet — keys can't be saved until it is.</p>}
          <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
            {chs.map((ch) => { const c = data.channels[ch]; return (
              <li key={ch} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{LABEL[ch]}</p>
                  <p className="text-[12px] text-muted">{c.saved.length ? `${c.saved.length} key${c.saved.length > 1 ? "s" : ""} saved` : "No seller keys"}{c.fromServer.length ? ` · ${c.fromServer.length} from agency default` : ""}</p>
                </div>
                {c.configured ? <Badge tone="pos">On</Badge> : <Badge>Off</Badge>}
                <Button size="sm" disabled={!data.canSave} onClick={() => { setVals({}); setOpen(ch); }}><KeyRound />Keys</Button>
              </li>
            ); })}
          </ul>
        </>
      )}
      <Modal open={!!open} onOpenChange={(o) => { if (!o) { setOpen(null); setVals({}); } }} title={open ? LABEL[open] : ""} description="Leave a box empty to keep what is already saved. Saved values are never shown." footer={<><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => void save()}><Lock />Save & lock</Button></>}>
        {cur && <div className="space-y-3">{cur.keys.map((k) => (
          <Field key={k} label={k} hint={HINT[k]}>
            <div className="flex gap-2">
              <Input type="password" autoComplete="off" spellCheck={false} placeholder={cur.saved.includes(k) ? "•••••• saved" : cur.fromServer.includes(k) ? "using agency default" : "not set"} value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
              {cur.saved.includes(k) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save(k)}>Remove</Button>}
            </div>
          </Field>
        ))}</div>}
      </Modal>
    </Card>
  );
}
