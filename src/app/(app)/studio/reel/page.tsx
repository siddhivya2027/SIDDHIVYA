"use client";
import { Circle, Download, ImagePlus, Pause, Play, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { Button, Card, CardHeader, Field, Input, Segmented, Select } from "@/components/ui";
import { marketplaceNames } from "@/lib/launch/engine";
import { compressPhoto } from "@/lib/launch/media";
import type { Photo } from "@/lib/launch/types";
import { useStore } from "@/lib/store";

const W = 1080, H = 1920;
type Theme = "saffron" | "lotus" | "night";
const THEMES: Record<Theme, { bg: string; ink: string; accent: string; chip: string }> = {
  saffron: { bg: "#fff4e6", ink: "#1c1320", accent: "#c2510c", chip: "#1c1320" },
  lotus: { bg: "#fde7f1", ink: "#1c1320", accent: "#a8306c", chip: "#1c1320" },
  night: { bg: "#0e0a12", ink: "#f4ede6", accent: "#f5a742", chip: "#f5a742" },
};
interface Spec { photos: HTMLImageElement[]; brand: string; name: string; size: string; price: string; mrp: string; cta: string; per: number; theme: Theme }
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function load(src: string) { return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

/** Draws one frame of the reel at time t (seconds). Pure drawing — used for preview and recording alike. */
function frame(ctx: CanvasRenderingContext2D, s: Spec, t: number) {
  const th = THEMES[s.theme];
  const n = Math.max(1, s.photos.length), seg = s.per, endT = n * seg, total = endT + 2.2;
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  const font = (w: number, px: number) => `${w} ${px}px "Plus Jakarta Sans", "Inter", system-ui, sans-serif`;
  if (t < endT + 0.4 && s.photos.length) {
    const i = Math.min(n - 1, Math.floor(t / seg));
    const draw = (k: number, alpha: number) => {
      const img = s.photos[k]; if (!img) return;
      const local = t - k * seg, z = 1 + 0.12 * Math.min(1, local / seg);
      const box = { x: 60, y: 260, w: W - 120, h: 1180 };
      const sc = Math.max(box.w / img.width, box.h / img.height) * z;
      const dw = img.width * sc, dh = img.height * sc;
      ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 48); ctx.clip();
      ctx.drawImage(img, box.x + (box.w - dw) / 2 - (k % 2 ? 1 : -1) * 20 * (z - 1) * 8, box.y + (box.h - dh) / 2, dw, dh);
      ctx.restore();
    };
    draw(i, 1);
    const into = t - (i + 1) * seg + 0.4; // crossfade into the next photo
    if (i + 1 < n && into > 0) draw(i + 1, ease(into / 0.4));
  }
  // brand
  ctx.textAlign = "center"; ctx.fillStyle = th.accent; ctx.font = font(800, 46);
  ctx.globalAlpha = ease(t / 0.6); ctx.fillText(s.brand.toUpperCase(), W / 2, 170); ctx.globalAlpha = 1;
  // name slides up
  const a = ease((t - 0.3) / 0.7);
  ctx.fillStyle = th.ink; ctx.font = font(800, 84); ctx.globalAlpha = a;
  ctx.fillText(s.name, W / 2, 1580 + (1 - a) * 60);
  ctx.font = font(500, 44); ctx.fillText(s.size, W / 2, 1650 + (1 - a) * 60); ctx.globalAlpha = 1;
  // price pops in on the last photo
  if (s.price) {
    const pt = ease((t - (endT - seg + 0.3)) / 0.5);
    if (pt > 0) {
      ctx.save(); ctx.translate(W - 230, 1340); ctx.scale(pt, pt);
      ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = font(800, 64); ctx.fillText(`₹${s.price}`, 0, 12);
      if (s.mrp) { ctx.font = font(500, 30); ctx.fillText(`MRP ₹${s.mrp}`, 0, 62); }
      ctx.restore();
    }
  }
  // end card
  if (t > endT) {
    const e = ease((t - endT) / 0.5);
    ctx.globalAlpha = e; ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = th.accent; ctx.font = font(800, 54); ctx.fillText(s.brand.toUpperCase(), W / 2, 780);
    ctx.fillStyle = th.ink; ctx.font = font(800, 96); ctx.fillText(s.name, W / 2, 920);
    if (s.price) { ctx.font = font(700, 64); ctx.fillText(`₹${s.price} · ${s.size}`, W / 2, 1030); }
    ctx.fillStyle = th.chip; ctx.beginPath(); ctx.roundRect(140, 1120, W - 280, 120, 60); ctx.fill();
    ctx.fillStyle = s.theme === "night" ? "#1f0d02" : "#fff"; ctx.font = font(700, 40); ctx.fillText(s.cta, W / 2, 1194);
    ctx.globalAlpha = 1;
  }
  return total;
}

function ReelMaker() {
  const params = useSearchParams();
  const launch = useStore((s) => s.launches.find((l) => l.id === params.get("launch")));
  const [photos, setPhotos] = React.useState<Photo[]>(launch?.photos ?? []);
  const [brand, setBrand] = React.useState(launch?.brand ?? "");
  const [name, setName] = React.useState(launch?.name ?? "");
  const [size, setSize] = React.useState(launch?.size ?? "");
  const [price, setPrice] = React.useState(launch?.price ? String(launch.price) : "");
  const [mrp, setMrp] = React.useState(launch?.mrp && launch.mrp > launch.price ? String(launch.mrp) : "");
  const where = launch ? marketplaceNames(launch).slice(0, 3) : [];
  const [cta, setCta] = React.useState(where.length ? `Order on ${where.join(" · ")}` : "Order now — link in bio");
  const [per, setPer] = React.useState(2.5);
  const [theme, setTheme] = React.useState<Theme>("saffron");
  const [imgs, setImgs] = React.useState<HTMLImageElement[]>([]);
  const [playing, setPlaying] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [video, setVideo] = React.useState<{ url: string; ext: string } | null>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const file = React.useRef<HTMLInputElement>(null);
  const raf = React.useRef(0);

  React.useEffect(() => { void Promise.all(photos.map((p) => load(p.src))).then(setImgs).catch(() => toast("A photo could not be loaded.", "error")); }, [photos]);
  const spec = React.useMemo<Spec>(() => ({ photos: imgs, brand, name, size, price, mrp, cta, per, theme }), [imgs, brand, name, size, price, mrp, cta, per, theme]);
  React.useEffect(() => { const ctx = canvas.current?.getContext("2d"); if (ctx && !playing && !recording) frame(ctx, spec, Math.min(1.2, photos.length * per)); }, [spec, playing, recording, photos.length, per]);
  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const run = (onEnd?: () => void) => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const total = frame(ctx, spec, t);
      if (t < total) raf.current = requestAnimationFrame(step); else onEnd?.();
    };
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(step);
  };
  const play = () => { if (playing) { cancelAnimationFrame(raf.current); setPlaying(false); return; } setPlaying(true); run(() => setPlaying(false)); };
  const record = () => {
    const cv = canvas.current;
    if (!cv || typeof MediaRecorder === "undefined" || !("captureStream" in cv)) { toast("This browser cannot record video. Use Chrome or Edge on a computer.", "error"); return; }
    const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const stream = cv.captureStream(30);
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || mime || "video/webm";
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ url: URL.createObjectURL(new Blob(chunks, { type })), ext: type.includes("mp4") ? "mp4" : "webm" });
      setRecording(false);
    };
    setRecording(true); setVideo(null);
    rec.start(250);
    run(() => setTimeout(() => rec.stop(), 200));
  };
  const add = async (list: FileList | null) => {
    if (!list) return;
    try { const more = await Promise.all(Array.from(list).slice(0, 8).map((f) => compressPhoto(f, 1400, 0.85))); setPhotos((p) => [...p, ...more].slice(0, 8)); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not add the photo.", "error"); }
  };
  const seconds = (photos.length * per + 2.2).toFixed(1);

  return (
    <>
      <PageHeader title="Reel maker" description="Turns product photos into a 9:16 video for Instagram Reels, Facebook and WhatsApp — zoom, price pop-up and an end card. Recorded right here in the browser." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Content" subtitle={launch ? `Filled from ${launch.name} in One-Click Launch.` : "Add photos and text, or open this from a product in One-Click Launch."} action={
            <>
              <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
              <Button onClick={() => file.current?.click()}><ImagePlus />Add photos</Button>
            </>
          } />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <figure key={p.id} className="relative"><img src={p.src} alt={`Photo ${i + 1}`} className="size-20 rounded-lg object-cover" /><Button size="icon" variant="danger" aria-label="Remove photo" className="absolute -top-2 -right-2 size-6" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}><Trash2 /></Button></figure>
              ))}
              {!photos.length && <p className="text-[13px] text-muted">No photos yet — 3 to 5 work best.</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Brand"><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
              <Field label="Product name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Pack size"><Input value={size} onChange={(e) => setSize(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Price (₹)"><Input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} /></Field><Field label="MRP (₹)"><Input value={mrp} onChange={(e) => setMrp(e.target.value.replace(/[^\d]/g, ""))} /></Field></div>
              <Field label="Last line (call to action)" className="sm:col-span-2"><Input value={cta} onChange={(e) => setCta(e.target.value)} /></Field>
              <Field label="Seconds per photo"><Select value={String(per)} onChange={(e) => setPer(Number(e.target.value))}>{[1.5, 2, 2.5, 3, 4].map((s) => <option key={s} value={s}>{s} s</option>)}</Select></Field>
              <Field label="Look"><Segmented label="Look" value={theme} onChange={setTheme} options={[{ value: "saffron", label: "Saffron" }, { value: "lotus", label: "Lotus" }, { value: "night", label: "Night" }]} /></Field>
            </div>
            <p className="text-[12px] text-faint">Length: {seconds} seconds. Chrome and Edge save MP4 where supported, otherwise WebM (Instagram accepts MP4; convert WebM if needed).</p>
          </div>
        </Card>
        <Card className="p-4">
          <canvas ref={canvas} width={W} height={H} className="mx-auto aspect-[9/16] w-full max-w-[320px] rounded-xl border border-line bg-raised" aria-label="Reel preview" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button onClick={play} disabled={recording || !photos.length}>{playing ? <><Pause />Stop</> : <><Play />Preview</>}</Button>
            <Button variant="primary" onClick={record} disabled={recording || playing || !photos.length}><Circle className={recording ? "animate-pulse fill-current" : ""} />{recording ? "Recording…" : "Record video"}</Button>
          </div>
          {video && (
            <div className="mt-4 space-y-2">
              <video src={video.url} controls playsInline className="mx-auto w-full max-w-[220px] rounded-lg" />
              <a href={video.url} download={`${(name || "reel").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-reel.${video.ext}`} className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-accent text-[13px] font-medium text-accent-ink"><Download className="size-4" />Download {video.ext.toUpperCase()}</a>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default function ReelPage() {
  return <React.Suspense fallback={null}><ReelMaker /></React.Suspense>;
}
