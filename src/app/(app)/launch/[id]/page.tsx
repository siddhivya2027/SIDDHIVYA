"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { APPROVAL, ChannelDots, PhotoThumb } from "@/components/launch/bits";
import { ApprovalCard } from "@/components/launch/approval";
import { AdsCard, CreativeCard } from "@/components/launch/creative-ads";
import { ListingsCard } from "@/components/launch/listings";
import { PhotosCard, ProductForm } from "@/components/launch/product-form";
import { ChecksList, OneClickButton, PublishCard } from "@/components/launch/publish";
import { SearchCard } from "@/components/launch/search-card";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { inr } from "@/lib/format";
import { isSellerLogin } from "@/lib/live/auth-client";
import { SellerProductView } from "@/components/live/seller-product";
import { useStore } from "@/lib/store";
import { deleteLaunch, useLaunch, useSellers } from "@/lib/launch/state";

const STEPS = [["#product", "Product"], ["#photos", "Photos"], ["#listings", "Where to sell"], ["#creative", "Post image"], ["#ads", "Ads"], ["#search", "Search"], ["#approval", "Approval"], ["#publish", "ONE CLICK"]] as const;

export default function LaunchProductPage() {
  const { id } = useParams<{ id: string }>();
  const p = useLaunch(id);
  const router = useRouter();
  const sellers = useSellers();
  const sellerLogin = isSellerLogin(useStore((s) => s.session));
  if (!p) return <EmptyState title="Product not found" body="It may have been deleted." action={<Link href="/launch" className="text-[13px] font-medium text-accent">Back to products</Link>} />;
  const seller = sellers.find((c) => c.id === p.clientId);
  if (sellerLogin) return (
    <>
      <Link href="/launch" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-4" />My products</Link>
      <SellerProductView p={p} />
    </>
  );
  const remove = () => { if (window.confirm(`Delete ${p.name || "this product"}? This cannot be undone.`)) { deleteLaunch(p.id); router.push("/launch"); } };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/launch" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-4" />One-Click Launch</Link>
        <h1 className="text-[22px] font-semibold">{p.name || "New product"}</h1>
        <Badge tone={APPROVAL[p.approval.state].tone}>{APPROVAL[p.approval.state].label}</Badge>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={remove}><Trash2 />Delete</Button>
      </div>
      <nav aria-label="Steps" className="scroll-thin sticky top-0 z-10 -mx-1 mb-4 flex gap-1 overflow-x-auto bg-bg/90 px-1 py-2 backdrop-blur">
        {STEPS.map(([href, label], i) => <a key={href} href={href} className="rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-medium whitespace-nowrap text-muted hover:text-ink">{i + 1}. {label}</a>)}
      </nav>
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <section id="product" className="scroll-mt-16"><ProductForm p={p} /></section>
          <section id="photos" className="scroll-mt-16"><PhotosCard p={p} /></section>
          <section id="listings" className="scroll-mt-16"><ListingsCard p={p} /></section>
          <section id="creative" className="scroll-mt-16"><CreativeCard p={p} /></section>
          <section id="ads" className="scroll-mt-16"><AdsCard p={p} /></section>
          <section id="search" className="scroll-mt-16"><SearchCard p={p} /></section>
          <section id="approval" className="scroll-mt-16"><ApprovalCard p={p} /></section>
          <section id="publish" className="scroll-mt-16"><PublishCard p={p} /></section>
        </div>
        <aside className="hidden xl:block">
          <Card className="sticky top-14 space-y-4 p-4">
            <div className="flex items-center gap-3"><PhotoThumb p={p} size={56} /><div className="min-w-0"><p className="truncate font-semibold">{p.brand} {p.name}</p><p className="text-[12px] text-muted">{p.size} · {p.price ? inr(p.price) : "no price"} · {p.stock} packs</p><p className="text-[12px] text-faint">{seller?.name}</p></div></div>
            <ChannelDots p={p} />
            <OneClickButton p={p} />
            <div><p className="mb-1.5 text-[11.5px] font-semibold text-faint uppercase">Ready check</p><ChecksList p={p} /></div>
          </Card>
        </aside>
      </div>
    </>
  );
}
