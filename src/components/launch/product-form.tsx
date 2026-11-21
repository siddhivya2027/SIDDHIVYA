"use client";
import { Camera, ImagePlus, Star, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/shared";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { FOOD_LABEL, writeListings } from "@/lib/launch/engine";
import { compressPhoto } from "@/lib/launch/media";
import { patchLaunch, useSellers } from "@/lib/launch/state";
import type { FoodCategory, LaunchProduct } from "@/lib/launch/types";

/** Applies a change and refreshes every listing that nobody edited by hand. */
export function useUpdate(id: string) {
  return React.useCallback((fn: (p: LaunchProduct) => LaunchProduct) => patchLaunch(id, (x) => { const n = fn(x); return { ...n, listings: writeListings(n) }; }), [id]);
}

const num = (v: string) => (v === "" ? 0 : Number(v.replace(/[^\d.]/g, "")) || 0);

export function ProductForm({ p }: { p: LaunchProduct }) {
  const up = useUpdate(p.id);
  const sellers = useSellers();
  const set = <K extends keyof LaunchProduct>(k: K, v: LaunchProduct[K]) => up((x) => ({ ...x, [k]: v }));
  const suggestSku = () => set("sku", `${p.brand.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SKU"}-${p.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "ITEM"}-${p.size.replace(/[^0-9A-Za-z]/g, "").toUpperCase()}`);
  return (
    <Card>
      <CardHeader title="1 · The product" subtitle="Fill this once. Every listing, post, sheet and search answer is written from it." />
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Seller">
          <Select value={p.clientId} onChange={(e) => set("clientId", e.target.value)}>
            {sellers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Brand name (as on the box)"><Input value={p.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Sri Lakshmi Sweets" /></Field>
        <Field label="Product name"><Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Kaju Katli" /></Field>
        <Field label="Type of product">
          <Select value={p.category} onChange={(e) => set("category", e.target.value as FoodCategory)}>
            {(Object.keys(FOOD_LABEL) as FoodCategory[]).map((k) => <option key={k} value={k}>{FOOD_LABEL[k]}</option>)}
          </Select>
        </Field>
        <Field label="Pack size (shown to buyers)"><Input value={p.size} onChange={(e) => set("size", e.target.value)} placeholder="250 g" /></Field>
        <Field label="Weight with packing (grams)" hint="Used for courier charges."><Input inputMode="numeric" value={p.weightGrams || ""} onChange={(e) => set("weightGrams", num(e.target.value))} /></Field>
        <Field label="Selling price (₹, incl. GST)"><Input inputMode="decimal" value={p.price || ""} onChange={(e) => set("price", num(e.target.value))} placeholder="420" /></Field>
        <Field label="MRP (₹)"><Input inputMode="decimal" value={p.mrp || ""} onChange={(e) => set("mrp", num(e.target.value))} placeholder="450" /></Field>
        <Field label="Cost to make one pack (₹, excl. GST)" hint="Used to show real profit on each app."><Input inputMode="decimal" value={p.cost || ""} onChange={(e) => set("cost", num(e.target.value))} placeholder="210" /></Field>
        <Field label="GST rate on the product">
          <Select value={String(p.gstPct)} onChange={(e) => set("gstPct", Number(e.target.value))}>
            {[0, 0.05, 0.12, 0.18].map((g) => <option key={g} value={g}>{Math.round(g * 100)}%</option>)}
          </Select>
        </Field>
        <Field label="Total stock (packs)"><Input inputMode="numeric" value={p.stock || ""} onChange={(e) => set("stock", Math.round(num(e.target.value)))} placeholder="120" /></Field>
        <Field label="Best before (days from packing)"><Input inputMode="numeric" value={p.shelfLifeDays || ""} onChange={(e) => set("shelfLifeDays", Math.round(num(e.target.value)))} /></Field>
        <Field label="SKU (your code for this product)" className="sm:col-span-2 lg:col-span-1">
          <div className="flex gap-2"><Input value={p.sku} onChange={(e) => set("sku", e.target.value.toUpperCase().replace(/\s+/g, "-"))} placeholder="SLS-KAJU-250G" /><Button onClick={suggestSku}>Suggest</Button></div>
        </Field>
        <Field label="Ingredients" className="sm:col-span-2"><Input value={p.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder="Cashew nuts, sugar, ghee, edible silver leaf" /></Field>
        <Field label="Who makes it, and what makes it special" className="sm:col-span-2 lg:col-span-3" hint="One or two lines. Buyers and AI search engines both quote this.">
          <Textarea rows={2} value={p.story} onChange={(e) => set("story", e.target.value)} placeholder="Handmade every morning in a family sweet shop near Vijayawada, using whole cashews and pure ghee — no colours, no preservatives." />
        </Field>
        <Field label="Key selling points (one per line)" className="sm:col-span-2" hint="Up to 5. The writer adds ingredients, pack size and storage on its own.">
          <Textarea rows={3} value={p.keyPoints.join("\n")} onChange={(e) => set("keyPoints", e.target.value.split("\n"))} placeholder={"Made with whole cashews and pure ghee\nNo artificial colours or preservatives\nGift-ready box for Diwali and weddings"} />
        </Field>
        <Field label="Words buyers search for (comma separated)" hint="e.g. cashew sweet, diwali gift, kaju barfi">
          <Textarea rows={3} value={p.keywords} onChange={(e) => set("keywords", e.target.value)} />
        </Field>
        <Field label="Amazon product type" hint="Shown in Seller Central when you add a product. Needed for automatic listing."><Input value={p.amazonProductType} onChange={(e) => set("amazonProductType", e.target.value.toUpperCase().replace(/\s+/g, "_"))} /></Field>
        <Field label="Flipkart FSN" hint="From Seller Hub after the first listing is approved."><Input value={p.flipkartFsn} onChange={(e) => set("flipkartFsn", e.target.value.toUpperCase())} /></Field>
      </div>
    </Card>
  );
}

export function PhotosCard({ p }: { p: LaunchProduct }) {
  const up = useUpdate(p.id);
  const camera = React.useRef<HTMLInputElement>(null);
  const files = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const room = 8 - p.photos.length;
      const shots = await Promise.all(Array.from(list).slice(0, Math.max(0, room)).map((f) => compressPhoto(f)));
      up((x) => ({ ...x, photos: [...x.photos, ...shots].slice(0, 8) }));
      if (list.length > room) toast("Up to 8 photos per product.", "error");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add the photo.", "error");
    } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader title="2 · Photos" subtitle="3 or more clear photos on a plain background sell best. The first photo is the main one." action={
        <>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          <input ref={files} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          <Button onClick={() => camera.current?.click()} disabled={busy}><Camera />Take photo</Button>
          <Button variant="primary" onClick={() => files.current?.click()} disabled={busy}><ImagePlus />{busy ? "Adding…" : "Add photos"}</Button>
        </>
      } />
      <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4 lg:grid-cols-6">
        {p.photos.map((ph, i) => (
          <figure key={ph.id} className="group relative overflow-hidden rounded-lg border border-line bg-raised">
            <img src={ph.src} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" />
            {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-ink">Main</span>}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {i > 0 && <Button size="icon" aria-label="Make main photo" onClick={() => up((x) => ({ ...x, photos: [ph, ...x.photos.filter((y) => y.id !== ph.id)] }))}><Star /></Button>}
              <Button size="icon" variant="danger" aria-label="Remove photo" onClick={() => up((x) => ({ ...x, photos: x.photos.filter((y) => y.id !== ph.id) }))}><Trash2 /></Button>
            </div>
          </figure>
        ))}
        {p.photos.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-muted">No photos yet. On a phone, "Take photo" opens the camera.</p>}
      </div>
    </Card>
  );
}
