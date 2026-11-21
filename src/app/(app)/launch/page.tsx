"use client";
import { Plus, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MetricCard, PageHeader } from "@/components/shared";
import { APPROVAL, ChannelDots, PhotoThumb } from "@/components/launch/bits";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { inr } from "@/lib/format";
import { CHANNELS } from "@/lib/launch/channels";
import { newLaunch, writeListings } from "@/lib/launch/engine";
import { liveCount, saveLaunch, useSellers } from "@/lib/launch/state";
import { newId, useStore } from "@/lib/store";
import { isSellerLogin } from "@/lib/live/auth-client";

export default function LaunchListPage() {
  const launches = useStore((s) => s.launches);
  const clientId = useStore((s) => s.clientId);
  const sellers = useSellers();
  const router = useRouter();
  const sellerLogin = isSellerLogin(useStore((s) => s.session));
  const sellerName = (id: string) => sellers.find((c) => c.id === id)?.name ?? "Seller";
  const create = () => {
    if (!clientId || !sellers.some((c) => c.id === clientId)) { router.push("/sellers"); return; }
    const p = newLaunch(newId(), clientId, sellerName(clientId));
    saveLaunch({ ...p, listings: writeListings(p) });
    router.push(`/launch/${p.id}`);
  };
  const approved = launches.filter((l) => l.approval.state === "approved").length;
  const live = launches.filter((l) => liveCount(l) > 0).length;
  const waiting = launches.filter((l) => l.approval.state === "sent").length;
  return (
    <>
      <PageHeader
        title={sellerLogin ? "My products" : "One-Click Launch"}
        description={sellerLogin ? "Your products, the price on every app and where they are live. Open one to approve it." : "Add a product once. SIDDHIVYA writes the listing for every app, makes the post image, checks profit after fees, gets the seller's approval on his phone — then one click sends it everywhere."}
        actions={sellerLogin ? undefined : <Button variant="primary" onClick={create}><Plus />New product</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Products" value={String(launches.length)} />
        <MetricCard label="Waiting for seller" value={String(waiting)} />
        <MetricCard label="Approved" value={String(approved)} />
        <MetricCard label="Live somewhere" value={String(live)} />
      </div>
      <Card>
        <CardHeader title="Products" subtitle={`${CHANNELS.length} channels: Amazon, Flipkart, Meesho, Blinkit, Zepto, Swiggy Instamart, Facebook, Instagram, WhatsApp, Google & AI search`} />
        {launches.length === 0 ? (
          <EmptyState icon={<Rocket />} title="No products yet" body={sellerLogin ? "The agency team will add your products here. You will get a message to approve each one." : "Start with one product — for example a 250 g box of Kaju Katli — and see it go everywhere with one click."} action={sellerLogin ? undefined : <Button variant="primary" onClick={create}><Plus />Add the first product</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="border-y border-line bg-raised text-[12px] text-muted">
                <tr>{["Product", "Seller", "Price", "Stock", "Seller approval", "Channels (filled = live)", "Updated"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {launches.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-raised/60" onClick={() => router.push(`/launch/${p.id}`)}>
                    <td className="px-4 py-2.5"><Link href={`/launch/${p.id}`} className="flex items-center gap-2.5 font-medium" onClick={(e) => e.stopPropagation()}><PhotoThumb p={p} size={36} /><span>{p.name || "Untitled product"}<span className="block text-[11.5px] font-normal text-faint">{p.brand} · {p.size}</span></span></Link></td>
                    <td className="px-4 py-2.5">{sellerName(p.clientId)}</td>
                    <td className="tnum px-4 py-2.5">{p.price ? inr(p.price) : "—"}</td>
                    <td className="tnum px-4 py-2.5">{p.stock}</td>
                    <td className="px-4 py-2.5"><Badge tone={APPROVAL[p.approval.state].tone}>{APPROVAL[p.approval.state].label}</Badge></td>
                    <td className="px-4 py-2.5"><ChannelDots p={p} /></td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">{fmtDateTime(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
