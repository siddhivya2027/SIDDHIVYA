"use client";
import { CheckCircle2, Circle, Copy, MessageCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "@/components/shared";
import { Button, Modal } from "@/components/ui";
import { SITE } from "@/config/site";
import { checklistMessage, checklistStatus, doneCount, isFoodBusiness, SELLER_CHECKLIST } from "@/lib/launch/onboarding";
import { emptySetup, useSellers } from "@/lib/launch/state";
import { useStore } from "@/lib/store";

/** One seller's onboarding checklist: what is done, what is missing, and a ready WhatsApp message asking for the rest. */
export function SellerChecklist({ sellerId, onClose }: { sellerId: string | null; onClose: () => void }) {
  const seller = useSellers().find((c) => c.id === sellerId);
  const setup = useStore((s) => (sellerId ? s.sellerSetup[sellerId] : undefined)) ?? emptySetup();
  const launches = useStore((s) => s.launches);
  if (!sellerId || !seller) return null;
  const st = checklistStatus(setup, {
    email: seller.contact.email, agencyPhones: SITE.contact.phones, isFood: isFoodBusiness(seller.industry),
    maxPhotos: Math.max(0, ...launches.filter((l) => l.clientId === seller.id).map((l) => l.photos.length)),
  });
  const n = doneCount(st);
  const msg = checklistMessage(seller.contact.name || seller.name, st, SITE.company);
  const copy = async () => { try { await navigator.clipboard.writeText(msg); toast("Copied."); } catch { toast("Copy failed.", "error"); } };
  const goFill = () => { useStore.setState({ clientId: seller.id }); onClose(); };
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }} title={`${seller.name} — onboarding checklist (${n}/${SELLER_CHECKLIST.length})`} description="Every account must be in the seller's own name, mobile, GST, PAN and bank. We are only added as a user."
      footer={<><Link href="/channels" onClick={goFill} className="inline-flex h-8.5 items-center rounded-md border border-line px-3 text-[13px] font-medium">Fill details</Link><Button variant="primary" onClick={onClose}>Done</Button></>}>
      <ul className="space-y-2.5">
        {SELLER_CHECKLIST.map((c) => {
          const s = st.find((x) => x.id === c.id)!;
          return (
            <li key={c.id} className="flex gap-2.5 text-[13px]">
              {s.done ? <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-pos" /> : <Circle className="mt-0.5 size-4.5 shrink-0 text-faint" />}
              <div className="min-w-0">
                <p className="font-semibold">{c.title} <span className={`font-normal ${s.done ? "text-muted" : "text-warn"}`}>— {s.text}</span></p>
                <p className="text-[12px] text-muted">{c.why}</p>
                {s.warn && <p className="mt-0.5 flex items-center gap-1 text-[12px] text-neg"><TriangleAlert className="size-3.5" />{s.warn}</p>}
                {c.note && !s.done && <p className="mt-0.5 text-[12px] text-faint">{c.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 rounded-lg bg-raised p-3">
        <p className="mb-1.5 text-[12px] font-medium text-muted">{n === SELLER_CHECKLIST.length ? "All done — message to send" : "Ask the seller for the missing items"}</p>
        <pre className="max-h-40 overflow-auto text-[12px] whitespace-pre-wrap">{msg}</pre>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void copy()}><Copy />Copy</Button>
          {setup.phone && <a href={`https://wa.me/${setup.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#0b8a5f] px-2.5 text-[12.5px] font-medium text-white"><MessageCircle className="size-3.5" />Send on WhatsApp</a>}
        </div>
      </div>
    </Modal>
  );
}
