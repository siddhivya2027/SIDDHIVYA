"use client";
/** Browser-side image work: shrink phone photos before saving, make thumbnails, and draw the 1080×1080 post image. */
import type { LaunchProduct, Photo } from "./types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Could not read the image.")); i.src = src; });
}
const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read the file.")); r.readAsDataURL(f); });

/** Shrinks a photo to at most `max` px on its long side as JPEG — keeps browser storage small (about 100–200 KB each). */
export async function compressPhoto(file: File, max = 1100, quality = 0.82): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  const img = await loadImage(await readFile(file));
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { id: Math.random().toString(36).slice(2, 10), src: c.toDataURL("image/jpeg", quality), w, h };
}

export async function thumbnail(src: string, size = 120, quality = 0.6): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL("image/jpeg", quality);
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let line = "";
  for (const w of text.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}

/** The square post image used for Facebook, Instagram and WhatsApp: photo on top, name, pack size, price and where to buy. */
export async function drawBanner(p: LaunchProduct, where: string[]): Promise<string> {
  const S = 1080, c = document.createElement("canvas"); c.width = S; c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, "#fff4e6"); g.addColorStop(1, "#fde7f1");
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  if (p.photos[0]) {
    const img = await loadImage(p.photos[0].src);
    ctx.save(); ctx.beginPath(); ctx.roundRect(48, 48, S - 96, 640, 36); ctx.clip(); cover(ctx, img, 48, 48, S - 96, 640); ctx.restore();
  }
  const font = (w: number, s: number) => `${w} ${s}px "Plus Jakarta Sans", "Inter", system-ui, sans-serif`;
  // price tag
  if (p.price) {
    ctx.fillStyle = "#c2510c"; ctx.beginPath(); ctx.roundRect(S - 360, 600, 280, 130, 30); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = font(800, 64); ctx.textAlign = "center"; ctx.fillText(`₹${p.price.toLocaleString("en-IN")}`, S - 220, 690);
    if (p.mrp > p.price) { ctx.font = font(500, 26); ctx.fillStyle = "#c2510c"; ctx.fillText(`MRP ₹${p.mrp.toLocaleString("en-IN")}`, S - 220, 770); }
  }
  ctx.textAlign = "left"; ctx.fillStyle = "#a8306c"; ctx.font = font(700, 30);
  ctx.fillText((p.brand || "").toUpperCase(), 64, 770);
  ctx.fillStyle = "#1c1320"; ctx.font = font(800, 62);
  let y = 840;
  for (const ln of wrapText(ctx, p.name, S - 460).slice(0, 2)) { ctx.fillText(ln, 64, y); y += 70; }
  ctx.fillStyle = "#62566a"; ctx.font = font(500, 32); ctx.fillText(p.size, 64, y + 4);
  if (where.length) {
    ctx.fillStyle = "#1c1320"; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.roundRect(48, S - 118, S - 96, 72, 36); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.font = font(600, 28); ctx.textAlign = "center";
    ctx.fillText(`Order on ${where.slice(0, 5).join(" · ")}`, S / 2, S - 72);
  }
  return c.toDataURL("image/jpeg", 0.85);
}
