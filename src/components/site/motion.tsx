"use client";

/**
 * SIDDHIVYA motion kit — its own set of effects:
 *  • LotusField    — hundreds of glowing seeds that bloom into a lotus, change petal count, and scatter away from the pointer
 *  • FlipWords     — a slot-machine word flip with blur
 *  • RiseWords     — headline words rise in one by one
 *  • Odometer      — numbers roll digit by digit like a meter
 *  • HScroll       — a pinned section where scrolling down slides cards sideways
 *  • Spotlight     — a glowing border that follows the pointer around a card
 *  • Magnetic      — buttons that lean toward the pointer
 *  • CursorGlow    — a soft saffron light that trails the pointer
 *  • SpeedMarquee  — two strips moving in opposite directions that speed up and lean as you scroll
 *  • Unfold        — a preview that rises flat as it scrolls into view
 * Everything stops for visitors who choose "reduce motion".
 */
import * as React from "react";
import { cn } from "@/components/ui";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
const cssVar = (el: Element, name: string, fb: string) => getComputedStyle(el).getPropertyValue(name).trim() || fb;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------- Lotus particle bloom ---------- */
const PETALS = [5, 8, 6, 12];
export function LotusField({ className }: { className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const still = reduced();
    const N = window.innerWidth < 640 ? 520 : 980;
    const seeds = Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2 * 7.13, u: i % 10 < 7 ? 0.82 + Math.random() * 0.18 : Math.sqrt(Math.random()) * 0.8, x: 0, y: 0, vx: 0, vy: 0, s: 0.6 + Math.random() * 1.6, tw: Math.random() * 6.28 }));
    let W = 0, H = 0, cx = 0, cy = 0, R = 0, raf = 0, visible = true;
    const t0 = performance.now();
    const mouse = { x: -9999, y: -9999 };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wide = W > 900; cx = wide ? W * 0.74 : W * 0.5; cy = wide ? H * 0.5 : H * 0.36; R = Math.min(wide ? H * 0.42 : W * 0.46, 380);
    };
    size();
    for (const p of seeds) { p.x = cx + (Math.random() - 0.5) * W; p.y = cy + (Math.random() - 0.5) * H; }
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      if (visible) {
        // the petal count eases from one shape to the next every 5 seconds
        const phase = t / 5, i0 = Math.floor(phase) % PETALS.length, i1 = (i0 + 1) % PETALS.length;
        const f = phase % 1, mix = f < 0.7 ? 0 : (1 - Math.cos(((f - 0.7) / 0.3) * Math.PI)) / 2;
        const k = PETALS[i0] + (PETALS[i1] - PETALS[i0]) * mix;
        const rot = t * 0.12, breathe = 1 + Math.sin(t * 0.9) * 0.04, intro = still ? 1 : Math.min(1, t / 2.2);
        const dark = document.documentElement.classList.contains("dark");
        const saffron = cssVar(cv, "--accent", "#f5a742"), lotus = cssVar(cv, "--ai", "#ec6fae");
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
        for (const p of seeds) {
          const petal = Math.pow(Math.abs(Math.cos((k * p.a) / 2)), 0.55);
          const r = R * breathe * (0.12 + 0.88 * petal) * p.u * (0.25 + 0.75 * intro);
          const tx = cx + Math.cos(p.a + rot) * r, ty = cy + Math.sin(p.a + rot) * r * 0.82;
          p.vx += (tx - p.x) * 0.018; p.vy += (ty - p.y) * 0.018;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) { const d = Math.sqrt(d2) || 1, push = (1 - d / 140) * 3.2; p.vx += (dx / d) * push; p.vy += (dy / d) * push; }
          p.vx *= 0.86; p.vy *= 0.86; p.x += p.vx; p.y += p.vy;
          const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2 + p.tw));
          ctx.globalAlpha = Math.min(1, (0.25 + 0.6 * (1 - p.u * 0.6)) * glow * (dark ? 1 : 1.4));
          ctx.fillStyle = p.u < 0.55 ? saffron : lotus;
          ctx.beginPath(); ctx.arc(p.x, p.y, dark ? p.s : p.s * 1.15, 0, 6.283); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
        g.addColorStop(0, dark ? "rgba(245,167,66,0.20)" : "rgba(245,154,60,0.16)"); g.addColorStop(1, "rgba(245,167,66,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, 6.283); ctx.fill();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    if (still) { for (let i = 0; i < 160; i++) draw(t0 + 2600); } else raf = requestAnimationFrame(draw);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const host = cv.parentElement!;
    const move = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    host.addEventListener("pointermove", move); host.addEventListener("pointerleave", leave); window.addEventListener("resize", size);
    return () => { cancelAnimationFrame(raf); io.disconnect(); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); window.removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} aria-hidden className={cn("lotus-field pointer-events-none absolute inset-0 h-full w-full", className)} />;
}

/* ---------- Slot-machine word flip ---------- */
export function FlipWords({ words, className }: { words: string[]; className?: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 2300);
    return () => clearInterval(t);
  }, [words.length]);
  return (
    <span className={cn("flip-words", className)} aria-label={words.join(", ")}>
      <span className="flip-track" style={{ transform: `translateY(${-i * 1.12}em)` }} aria-hidden>
        {words.map((w, k) => <span key={w} className={cn("flip-word", k === i && "on")}>{w}</span>)}
      </span>
    </span>
  );
}

/* ---------- Headline words rising in ---------- */
export function RiseWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={cn("rise-words", className)} aria-label={text}>
      {text.split(" ").map((w, k) => <span key={k} className="rise-word" aria-hidden style={{ animationDelay: `${delay + k * 90}ms` }}>{w}&nbsp;</span>)}
    </span>
  );
}

/* ---------- Odometer: each digit rolls into place ---------- */
export function Odometer({ value, prefix = "", suffix = "", className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduced()) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const label = prefix + value.toLocaleString("en-IN") + suffix;
  let di = 0;
  return (
    <span ref={ref} className={cn("odo tnum", className)} aria-label={label}>
      {label.split("").map((c, k) => {
        if (!/\d/.test(c)) return <span key={k} aria-hidden>{c}</span>;
        const d = Number(c), idx = di++;
        return (
          <span key={k} className="odo-col" aria-hidden>
            <span className="odo-reel" style={{ transform: `translateY(${on ? -d * 10 : 0}%)`, transitionDelay: `${idx * 70}ms` }}>
              {Array.from({ length: 10 }, (_, n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ---------- Scroll progress of an element (0 → 1) written to --p ---------- */
export function useScrollProgress<T extends HTMLElement>(span = 0.45) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduced()) { el.style.setProperty("--p", "1"); return; }
    let raf = 0;
    const on = () => { raf = 0; const b = el.getBoundingClientRect(), vh = window.innerHeight; el.style.setProperty("--p", String(clamp((vh - b.top) / (vh * span), 0, 1))); };
    const req = () => { if (!raf) raf = requestAnimationFrame(on); };
    on(); window.addEventListener("scroll", req, { passive: true }); window.addEventListener("resize", req);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", req); window.removeEventListener("resize", req); };
  }, [span]);
  return ref;
}

/* ---------- Pinned sideways scroll: scrolling down moves the cards left ---------- */
export function HScroll({ children, head, className }: { children: React.ReactNode; head?: React.ReactNode; className?: string }) {
  const outer = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = React.useState(false);
  React.useEffect(() => {
    const decide = () => setPinned(!reduced() && window.innerWidth >= 900);
    decide(); window.addEventListener("resize", decide);
    return () => window.removeEventListener("resize", decide);
  }, []);
  React.useEffect(() => {
    const o = outer.current, tr = track.current; if (!o || !tr) return;
    if (!pinned) { o.style.height = ""; tr.style.transform = ""; return; }
    let raf = 0;
    const extraW = () => Math.max(0, tr.scrollWidth - (tr.parentElement?.clientWidth ?? 0));
    const on = () => {
      raf = 0;
      const b = o.getBoundingClientRect(), extra = extraW();
      const p = clamp(-b.top / Math.max(1, b.height - window.innerHeight), 0, 1);
      tr.style.transform = `translate3d(${-p * extra}px,0,0)`;
      bar.current?.style.setProperty("transform", `scaleX(${p})`);
      const mid = window.innerWidth / 2;
      tr.querySelectorAll<HTMLElement>("[data-hcard]").forEach((c) => {
        const r = c.getBoundingClientRect(), d = clamp(Math.abs(r.left + r.width / 2 - mid) / mid, 0, 1);
        c.style.setProperty("--near", (1 - d).toFixed(3));
      });
    };
    const layout = () => { o.style.height = `${window.innerHeight + extraW()}px`; on(); };
    const req = () => { if (!raf) raf = requestAnimationFrame(on); };
    layout(); window.addEventListener("scroll", req, { passive: true }); window.addEventListener("resize", layout);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", req); window.removeEventListener("resize", layout); o.style.height = ""; };
  }, [pinned]);
  return (
    <div ref={outer} className={cn("relative", className)}>
      <div className={cn(pinned && "sticky top-0 flex h-svh flex-col justify-center overflow-hidden")}>
        {head}
        <div className={cn(pinned ? "mx-auto w-full max-w-6xl px-4 sm:px-6" : "-mx-4 overflow-x-auto px-4 pb-4 [scroll-snap-type:x_mandatory] sm:-mx-6 sm:px-6")}>
          <div ref={track} className="hscroll-track flex w-max gap-5 will-change-transform">{children}</div>
        </div>
        {pinned && <div className="mx-auto mt-8 h-[3px] w-48 overflow-hidden rounded-full bg-line"><div ref={bar} className="h-full origin-left scale-x-0 bg-gradient-to-r from-[var(--ai)] to-accent" /></div>}
      </div>
    </div>
  );
}

/* ---------- Spotlight card: a glowing border that follows the pointer ---------- */
export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType === "touch") return;
    const b = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - b.left}px`); el.style.setProperty("--my", `${e.clientY - b.top}px`); el.style.setProperty("--o", "1");
  };
  return <div ref={ref} onPointerMove={move} onPointerLeave={() => ref.current?.style.setProperty("--o", "0")} className={cn("spot", className)}>{children}</div>;
}

/* ---------- Magnetic: leans toward the pointer ---------- */
export function Magnetic({ children, className, strength = 0.28 }: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || reduced() || e.pointerType === "touch") return;
    const b = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * strength}px, ${(e.clientY - b.top - b.height / 2) * strength}px)`;
  };
  return <span ref={ref} onPointerMove={move} onPointerLeave={() => { if (ref.current) ref.current.style.transform = ""; }} className={cn("magnetic inline-flex", className)}>{children}</span>;
}

/* ---------- Soft light that trails the pointer ---------- */
export function CursorGlow() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (reduced() || !finePointer()) return;
    const el = ref.current; if (!el) return;
    let x = -500, y = -500, tx = x, ty = y, raf = 0;
    const move = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; el.style.opacity = "1"; };
    const loop = () => { x += (tx - x) * 0.12; y += (ty - y) * 0.12; el.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`; raf = requestAnimationFrame(loop); };
    window.addEventListener("pointermove", move); raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); };
  }, []);
  return <div ref={ref} className="cursor-glow" aria-hidden />;
}

/* ---------- Two strips in opposite directions that speed up and lean with scroll speed ---------- */
export function SpeedMarquee({ rows }: { rows: string[][] }) {
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);
  React.useEffect(() => {
    if (reduced()) return;
    let raf = 0, last = window.scrollY, vel = 0;
    const off = rows.map(() => 0);
    const loop = () => {
      const y = window.scrollY; vel += (y - last - vel) * 0.1; last = y;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const half = el.scrollWidth / 2, speed = 0.5 + Math.min(8, Math.abs(vel) * 0.25);
        off[i] += i % 2 ? speed : -speed;
        if (off[i] <= -half) off[i] += half;
        if (off[i] > 0) off[i] -= half;
        el.style.transform = `translate3d(${off[i]}px,0,0) skewX(${clamp(-vel * 0.25, -10, 10)}deg)`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rows]);
  return (
    <div className="speed-marquee space-y-3 overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" aria-label={rows.flat().join(", ")}>
      {rows.map((items, i) => (
        <div key={i} ref={(el) => { refs.current[i] = el; }} className="flex w-max gap-4 will-change-transform" aria-hidden>
          {[...items, ...items].map((x, k) => <span key={k} className={cn("sm-chip", i % 2 === 1 && "alt")}>{x}</span>)}
        </div>
      ))}
    </div>
  );
}

/* ---------- Unfold: the preview lies back and rises flat as it scrolls in ---------- */
export function Unfold({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollProgress<HTMLDivElement>(0.75);
  return <div ref={ref} className={cn("unfold", className)}><div className="unfold-inner">{children}</div></div>;
}
