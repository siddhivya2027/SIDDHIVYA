"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold hover:border-accent print:hidden"><Printer className="size-4" />Print / save as PDF</button>;
}
