"use client";
import { Copy, MessageCircle } from "lucide-react";
import { toast } from "@/components/shared";
import { Button, Modal } from "@/components/ui";

/** Shows a new temporary password once, with a ready WhatsApp message. It is never shown again. */
export function TempPassword({ info, onClose }: { info: { name: string; email: string; password: string; phone?: string } | null; onClose: () => void }) {
  if (!info) return null;
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const msg = `Hello ${info.name}, your SIDDHIVYA login:\n${site}/login\nEmail: ${info.email}\nTemporary password: ${info.password}\nYou will be asked to set your own password.`;
  const copy = async () => { try { await navigator.clipboard.writeText(msg); toast("Copied."); } catch { toast("Copy failed.", "error"); } };
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }} title="Login created" description="Shown only once. Send it to the person now."
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <pre className="rounded-lg bg-raised p-3 text-[13px] whitespace-pre-wrap">{msg}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={copy}><Copy />Copy</Button>
        {info.phone && <a href={`https://wa.me/${info.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-[#0b8a5f] px-3 text-[13px] font-medium text-white"><MessageCircle className="size-4" />Send on WhatsApp</a>}
      </div>
    </Modal>
  );
}
