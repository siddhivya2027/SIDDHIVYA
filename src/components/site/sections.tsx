"use client";
import { ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Bell, Calculator, Camera, Check, ClipboardCheck, FileText, Handshake, LayoutDashboard, Megaphone, Radar, Search, Send, Share2, ShieldCheck, Sparkles, Store, TrendingUp, UserPlus, Warehouse } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/components/ui";
import { realStats, SITE, waHref } from "@/config/site";
import { ADD_ONS, planPrice, SELLER_PLANS, SHOW_PRICES } from "@/lib/site/pricing";
import { FlipWords, HScroll, LotusField, Magnetic, Odometer, RiseWords, SpeedMarquee, Spotlight, Unfold, useScrollProgress } from "./motion";
import { ECOMMERCE_CALCS, FEE_CONFIGS, QUICK_CALCS } from "@/lib/site/fees";
import { calcHref } from "./fee-calculators";
import { SELLER_CHECKLIST, type CheckId } from "@/lib/launch/onboarding";
import { Banknote, Camera as CameraIcon, IdCard, KeyRound, MapPin, ReceiptText, Smartphone, UtensilsCrossed } from "lucide-react";

/* ---------- Reveal on scroll (content stays readable if JS or motion is off) ---------- */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { el.dataset.shown = ""; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.shown = ""; io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function SectionHead({ id, eyebrow, title, accent, body, center }: { id?: string; eyebrow: string; title: string; accent?: string; body?: string; center?: boolean }) {
  return (
    <Reveal className={cn("max-w-2xl scroll-mt-20", center && "mx-auto text-center")}>
      <div id={id} className="scroll-mt-24" />
      <p className={cn("eyebrow inline-flex items-center gap-2", center && "justify-center")}><span className="live-dot" aria-hidden />{eyebrow}</p>
      <h2 className="mt-4 text-[36px] leading-[1.02] sm:text-[54px]">{title}{accent && <> <span className="em-s">{accent}</span></>}</h2>
      {body && <p className="mt-4 text-[16px] text-muted">{body}</p>}
    </Reveal>
  );
}

/* ---------- Shared CTA button (leans toward the pointer) ---------- */
export function GlowButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <Magnetic><a href={href} className={cn("btn-siddhi shimmer group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14.5px] font-semibold text-accent-ink shadow-card hover:brightness-110", className)}>{children}</a></Magnetic>;
}

/* ---------- Hero: a lotus of glowing seeds that blooms, changes petals and scatters from the pointer ---------- */
const CYCLE = ["Amazon", "Flipkart", "Myntra", "Meesho", "Instagram"];
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <LotusField className="-z-10" />
      <div className="mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-center px-4 pt-14 pb-16 sm:px-6">
        <p className="eyebrow overlay-in w-fit"><span className="live-dot" aria-hidden />Marketplace growth agency · Tamil Nadu</p>
        <h1 className="mt-7 max-w-3xl text-[50px] sm:text-[88px]">
          <RiseWords text="Grow your shop" className="block" />
          <span className="block"><RiseWords text="on" delay={300} className="font-normal text-muted" /><FlipWords words={CYCLE} /></span>
        </h1>
        <p className="overlay-in mt-7 max-w-xl text-[17px] text-muted" style={{ animationDelay: "600ms" }}>{SITE.company} runs your marketplace shops for you — listings, ads, photos, videos and social media — and gives you your own dashboard to see every rupee it brings in.</p>
        <div className="overlay-in mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "800ms" }}>
          <GlowButton href="#enquiry">Get a free growth plan<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></GlowButton>
          <Magnetic><a href="#services" className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-[14.5px] font-semibold text-ink backdrop-blur hover:border-ink">See what we do</a></Magnetic>
        </div>
        <p className="mt-12 hidden text-[12.5px] text-faint sm:block"><span className="em-s text-[15px]">Tip:</span> move your mouse over the lotus</p>
      </div>
    </section>
  );
}

/* ---------- Numbers band: digits roll into place like a meter (facts about the service, not claims) ---------- */
const FACTS: { to: number; suffix?: string; label: string }[] = [
  { to: 4, label: "Marketplaces we run" },
  { to: 3, label: "Social platforms we post to" },
  { to: 9, label: "Free fee calculators" },
  { to: 24, suffix: "/7", label: "Alerts on your phone" },
  { to: 1, label: "Dashboard for everything" },
];
export function FactsBand() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FACTS.map((f, i) => (
          <Reveal key={f.label} delay={i * 70} className={cn(i === 4 && "col-span-2 sm:col-span-1")}>
            <Spotlight className="h-full rounded-3xl">
              <div className="h-full rounded-3xl border border-line bg-surface/70 px-5 py-6">
                <Odometer value={f.to} suffix={f.suffix} className="text-[44px] leading-none font-bold tracking-[-0.04em] sm:text-[52px]" />
                <span className="mt-3 block text-[13.5px] text-muted">{f.label}</span>
              </div>
            </Spotlight>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ---------- Two strips of channels that speed up and lean as you scroll ---------- */
const STRIPS = [
  ["Amazon", "Flipkart", "Myntra", "Meesho", "JioMart", "Ajio", "Nykaa", "Blinkit", "Zepto"],
  ["listings that sell", "ads that pay back", "reels that get seen", "reports in plain words", "Instagram", "Facebook", "WhatsApp", "Google"],
];
export function ChannelMarquee() {
  return <div className="border-y border-line"><SpeedMarquee rows={STRIPS} /></div>;
}

/* ---------- Services: a pinned section — scrolling down slides the cards sideways ---------- */
const SERVICE_CARDS = [
  { icon: Store, name: "Marketplace management", who: "Amazon · Flipkart · Myntra · Meesho", body: "We run your shops day to day — orders, stock, prices and offers." },
  { icon: ClipboardCheck, name: "Listings that sell", who: "Titles · images · A+", body: "Titles, bullet points, descriptions and images fixed to each marketplace's rules, so buyers find you." },
  { icon: Megaphone, name: "Marketplace ads", who: "Sponsored · PLA", body: "Amazon and Flipkart ads planned around profit, with wasted spend cut every week." },
  { icon: Share2, name: "Facebook & Instagram", who: "Meta ads · posts · reels", body: "Ads, posts and reels that send buyers to your shop — posted straight from our studio." },
  { icon: Camera, name: "Photos & videos", who: "Creative studio", body: "Product photos, banners and short videos made in one look for your brand." },
  { icon: Search, name: "Search everywhere", who: "Google · AI answers", body: "Be found on Google, inside marketplace search and in AI answers like ChatGPT and Gemini." },
  { icon: UserPlus, name: "New seller set-up", who: "Registration · catalogue", body: "Help with registration, documents and your first catalogue upload on each marketplace." },
  { icon: FileText, name: "Clear reports", who: "Telegram · PDF", body: "Daily alerts and a monthly report in plain words: what sold, what it cost, what's next." },
];
export function Services() {
  return (
    <section className="py-16">
      <HScroll
        head={<div className="mx-auto mb-10 w-full max-w-6xl px-4 sm:px-6"><SectionHead id="services" eyebrow="What we do" title="Everything your shop needs" accent="to sell more." body="Keep scrolling — the services slide past." /></div>}
      >
        {SERVICE_CARDS.map((c, i) => (
          <div key={c.name} data-hcard className="hcard shrink-0">
            <Spotlight className="h-full rounded-3xl">
              <a href="#enquiry" className="flex h-[340px] flex-col rounded-3xl border border-line bg-surface p-7">
                <div className="flex items-start justify-between">
                  <span className="flex size-14 items-center justify-center rounded-2xl text-accent-ink" style={{ background: `linear-gradient(135deg, hsl(${28 + i * 38} 90% 68%), hsl(${330 + i * 12} 75% 62%))` }}><c.icon className="size-6" /></span>
                  <span className="em-s text-[44px] leading-none">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-auto text-[28px] leading-[1.05] font-bold tracking-[-0.03em]">{c.name}</p>
                <p className="mt-2 text-[12.5px] font-semibold text-accent">{c.who}</p>
                <p className="mt-3 text-[14px] text-muted">{c.body}</p>
              </a>
            </Spotlight>
          </div>
        ))}
      </HScroll>
    </section>
  );
}

/* ---------- How we grow a seller ---------- */
const STRATEGY = [
  { icon: Radar, title: "Study your market", body: "Competitors, prices and what buyers search for in your category." },
  { icon: Warehouse, title: "Plan stock & offers", body: "So ads never push products that are about to run out." },
  { icon: ClipboardCheck, title: "Fix the shop window", body: "Listings, images and prices checked against each marketplace's rules." },
  { icon: Megaphone, title: "Bring in buyers", body: "Marketplace ads, Meta ads and social posts working together." },
  { icon: TrendingUp, title: "Measure & grow", body: "Your dashboard and monthly report show what worked and what's next." },
];
export function Strategy() {
  const line = useScrollProgress<HTMLDivElement>(0.8);
  return (
    <section className="relative overflow-hidden border-y border-line bg-surface/60">
      <div className="lotus-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHead center eyebrow="HOW WE WORK" title="Five steps," accent="one growing shop" body="Like preparing a field before sowing: each step makes the next one pay off." />
        <div ref={line} className="relative mt-12">
          <div className="absolute top-8 right-[10%] left-[10%] hidden h-px origin-left bg-gradient-to-r from-[var(--ai)] to-accent lg:block" style={{ transform: "scaleX(var(--p, 1))" }} aria-hidden />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STRATEGY.map((s, i) => (
              <Reveal key={s.title} delay={i * 90} className="text-center">
                <li className="list-none">
                  <span className="gold-frame relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-line bg-surface shadow-card"><s.icon className="size-6 text-accent" /><span className="tnum absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ai text-[11px] font-bold text-white">{i + 1}</span></span>
                  <p className="mt-4 text-[15px] font-semibold">{s.title}</p>
                  <p className="mt-1 text-[13px] text-muted">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Free tools grid ---------- */
export function ToolsGrid() {
  const card = (id: (typeof ECOMMERCE_CALCS)[number] | (typeof QUICK_CALCS)[number], i: number) => (
    <Reveal key={id} delay={i * 40}>
      <a href={calcHref(id)} className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-card">
        <span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Calculator className="size-4.5" /></span><span><span className="block text-[14.5px] font-semibold">{FEE_CONFIGS[id].name}</span><span className="block text-[12px] text-muted">{FEE_CONFIGS[id].blurb}</span></span></span>
        <ArrowUpRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </a>
    </Reveal>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div><p className="mb-3 text-[13px] font-semibold text-muted">E-commerce fee calculators</p><div className="grid gap-3">{ECOMMERCE_CALCS.map(card)}</div></div>
      <div><p className="mb-3 text-[13px] font-semibold text-muted">Quick-commerce fee calculators</p><div className="grid gap-3">{QUICK_CALCS.map(card)}</div>
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">Every calculator shows what reaches your bank, your real profit after GST credit, and the source of each fee rate — and every rate can be edited to match your own seller dashboard.</p></div>
    </div>
  );
}

/* ---------- Seller success stories (hidden until real stories are added in src/config/site.ts) ---------- */
export function Portfolio() {
  if (SITE.portfolio.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead center id="work" eyebrow="SELLER STORIES" title="Sellers we've" accent="helped grow" body="Shared with each seller's permission." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SITE.portfolio.map((p, i) => (
          <Reveal key={p.name} delay={i * 80}>
            <div className="gold-frame flex h-full flex-col rounded-3xl border border-line bg-surface p-5">
              <p className="font-royal text-[22px]">{p.name}</p>
              <p className="text-[12px] text-faint">{p.place}</p>
              <p className="mt-2 flex-1 text-[13px] text-muted">{p.work}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] text-muted">{t}</span>)}</div>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">Visit shop<ArrowUpRight className="size-3.5" /></a>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Your seller dashboard (unfolds as it scrolls in) ---------- */
const DASH = [
  { icon: LayoutDashboard, title: "All your numbers in one place", body: "Sales, orders, ad spend and profit from every marketplace, updated for you." },
  { icon: BadgeCheck, title: "Approve before it goes live", body: "See every new photo, video and ad and say yes from your phone." },
  { icon: BarChart3, title: "Ad return you can read", body: "For every ₹100 spent on ads, see how much came back in sales." },
  { icon: Bell, title: "Alerts on your phone", body: "Low stock, a sudden drop in sales or wasted ad money — told on Telegram." },
  { icon: FileText, title: "Monthly PDF report", body: "What sold, what it cost and the plan for next month, in plain words." },
  { icon: ShieldCheck, title: "Your shop stays yours", body: "Accounts stay in your name. We are added as a user — never the owner." },
];
function DashboardMock() {
  const bars = [30, 42, 38, 55, 50, 64, 61, 78, 74, 92, 86, 98];
  const sellers: [string, string, string][] = [["Kanchi Weaves", "Amazon · Flipkart", "+18%"], ["Thanjai Spices", "Amazon · Meesho", "+11%"], ["Kovai Home", "Flipkart · Myntra", "+7%"]];
  return (
    <div className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" /></span><span className="ml-2">{SITE.company} · Seller dashboard</span></p>
        <span className="mono rounded-md bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-medium text-warn">Illustration</span>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="grid grid-cols-3 gap-3">
            {[["Sales", 482000, "₹"], ["Orders", 1260, ""], ["Ad return", 5, "×"]].map(([l, v, u]) => (
              <div key={l as string} className="rounded-2xl bg-raised p-3">
                <p className="mono text-[10.5px] tracking-wider text-faint uppercase">{l}</p>
                <Odometer value={v as number} prefix={u === "₹" ? "₹" : ""} suffix={u === "×" ? "×" : ""} className="mt-1 block text-[20px] font-bold tracking-tight" />
              </div>
            ))}
          </div>
          <p className="mono mt-4 text-[11px] text-faint">Sales, last 12 weeks · all sellers</p>
          <div className="mt-2 flex h-36 items-end gap-1.5" aria-hidden>
            {bars.map((h, i) => <div key={i} className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-[var(--ai)] via-accent to-[var(--g-light)]" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />)}
          </div>
        </div>
        <ul className="space-y-2" aria-label="Sample sellers">
          {sellers.map(([n, m, g]) => (
            <li key={n} className="flex items-center justify-between rounded-2xl bg-raised px-3 py-2.5 text-[12.5px]">
              <span><span className="block font-semibold">{n}</span><span className="block text-[11px] text-faint">{m}</span></span>
              <span className="tnum rounded-full bg-pos-soft px-2 py-0.5 text-[11.5px] font-semibold text-pos">{g}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong px-3 py-2.5 text-[12px] text-muted"><Send className="size-3.5 text-ai" />Reel posted to Instagram · waiting for likes</li>
          <li className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong px-3 py-2.5 text-[12px] text-muted"><Bell className="size-3.5 text-accent" />Low stock: 6 left of Silk Saree – Maroon</li>
        </ul>
      </div>
    </div>
  );
}
export function SellerDashboard() {
  return (
    <section className="relative overflow-hidden border-y border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead id="platform" eyebrow="Your seller dashboard" title="See exactly what" accent="we do for you." body={`Every ${SITE.company} seller gets their own login. No waiting for updates — open the dashboard any time.`} />
          <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[14px] font-semibold transition-transform hover:-translate-y-0.5 hover:border-ink">Open the preview<ArrowUpRight className="size-4" /></Link>
        </div>
        <Unfold className="mt-12"><DashboardMock /></Unfold>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DASH.map((d, i) => (
            <Reveal key={d.title} delay={i * 50}>
              <Spotlight className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
                  <d.icon className="size-5 text-ai" aria-hidden />
                  <p className="mt-3 text-[15px] font-semibold">{d.title}</p>
                  <p className="mt-1 text-[13.5px] text-muted">{d.body}</p>
                </div>
              </Spotlight>
            </Reveal>
          ))}
        </div>
        <p className="mono mt-4 text-[11.5px] text-faint">The preview uses sample data.</p>
      </div>
    </section>
  );
}

/* ---------- Seller plans ---------- */
export function SellerPlans() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead center id="pricing" eyebrow="PLANS" title="Simple monthly plans," accent="no hidden costs" body="Pick a plan for where your shop is today. Move up any time as you grow." />
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {SELLER_PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <Spotlight className="h-full rounded-3xl">
            <div className={cn("relative flex h-full flex-col rounded-3xl border p-6", p.highlight ? "border-accent bg-gradient-to-b from-accent-soft to-surface shadow-card" : "border-line bg-surface")}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-ai px-3 py-1 text-[11px] font-semibold text-white">Most chosen</span>}
              <p className="eyebrow !text-accent">{p.name}</p>
              <p className="mt-1 text-[13px] text-muted">{p.forWho}</p>
              <p className="font-royal tnum mt-4 text-[46px] leading-none tracking-[-0.04em]">{planPrice(p)}</p>
              {SHOW_PRICES && <p className="mt-1 text-[12.5px] text-faint">a month + GST</p>}
              <ul className="mt-5 flex-1 space-y-2.5 text-[13.5px]">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pos" />{f}</li>)}
              </ul>
              <a href="#enquiry" className={cn("mt-6 inline-flex h-11 items-center justify-center rounded-full text-[14px] font-semibold", p.highlight ? "btn-siddhi text-accent-ink" : "border border-line-strong text-accent hover:bg-raised")}>Choose {p.name}</a>
            </div>
            </Spotlight>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[520px] text-left text-[13.5px]">
          <caption className="px-4 pt-3 text-left text-[13px] font-semibold">Add-ons</caption>
          <tbody className="divide-y divide-line">{ADD_ONS.map(([a, b]) => <tr key={a}><td className="px-4 py-2.5">{a}</td><td className="px-4 py-2.5 text-muted">{b}</td></tr>)}</tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-[12px] text-faint">All prices exclude 18% GST. Ad money is paid by you directly to the marketplace or Meta.</p>
      </Reveal>
    </section>
  );
}

/* ---------- Why sellers choose us ---------- */
const WHY = [
  { icon: Handshake, title: "One team, one number", body: "Listings, ads, creatives and reports — one manager to call." },
  { icon: Sparkles, title: "Smart tools, real people", body: "Our own platform spots problems early; our team fixes them." },
  { icon: ShieldCheck, title: "Your accounts, your control", body: "Everything stays in your name. You can see all we do." },
];
export function WhyUs() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        {WHY.map((w, i) => (
          <Reveal key={w.title} delay={i * 70}>
            <Spotlight className="h-full rounded-3xl"><div className="flex h-full gap-4 rounded-3xl border border-line bg-surface/70 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ai-soft text-ai"><w.icon className="size-5" /></span>
              <span><span className="block text-[15px] font-semibold">{w.title}</span><span className="mt-1 block text-[13.5px] text-muted">{w.body}</span></span>
            </div></Spotlight>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Social media marketing ---------- */
const PLATFORMS = [
  { name: "Instagram", hue: 330 }, { name: "Facebook", hue: 220 }, { name: "WhatsApp", hue: 142 },
  { name: "YouTube", hue: 0 }, { name: "Google", hue: 40 }, { name: "Threads", hue: 0, mono: true },
];
export function SocialSection() {
  const stats = realStats();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
      <div className="min-w-0">
        <SectionHead eyebrow="SOCIAL MEDIA" title="Make it once," accent="post it everywhere" body="We make your photos and videos in our studio and post them to Facebook and Instagram in one click — then show you the likes, clicks and sales they bring." />
        <Reveal>
          <ul className="mt-6 grid gap-2 text-[14px] text-muted sm:grid-cols-2">
            {["Monthly content calendar", "Reels, posts and stories", "Facebook & Instagram ads", "WhatsApp offers to your buyers"].map((t) => <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ai" />{t}</li>)}
          </ul>
          {stats.length > 0 && (
            <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
              {stats.map((s) => <div key={s.label} className="px-4 py-3"><p className="tnum text-[22px] font-semibold text-accent">{s.value}</p><p className="text-[12px] text-muted">{s.label}</p></div>)}
            </div>
          )}
          <GlowButton href="#enquiry" className="mt-7">Get a free strategy call<ArrowRight className="size-4" /></GlowButton>
        </Reveal>
      </div>
      <Reveal className="relative mx-auto aspect-square w-full max-w-[420px]">
        <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(224_96_154/0.22),transparent_70%)]" aria-hidden />
        <div className="absolute inset-[4%] rounded-full border border-dashed border-line-strong" aria-hidden />
        <div className="absolute top-1/2 left-1/2 flex h-[46%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[18px] border-4 border-accent/70 bg-surface p-1.5 shadow-card" aria-hidden>
          <div className="mx-auto h-1 w-6 rounded-full bg-line-strong" />
          <div className="mt-2 h-1/3 rounded-md bg-gradient-to-br from-[var(--g-light)] via-accent to-[var(--ai)]" />
          <div className="mt-1.5 h-1.5 w-3/4 rounded bg-line-strong" /><div className="mt-1 h-1.5 w-1/2 rounded bg-line" />
          <div className="mt-auto flex justify-around pb-1"><span className="size-2 rounded-full bg-ai" /><span className="size-2 rounded-full bg-accent" /><span className="size-2 rounded-full bg-pos" /></div>
        </div>
        <div className="orbit absolute inset-0" aria-label="Platforms we post to">
          {PLATFORMS.map((p, i) => {
            const a = (i / PLATFORMS.length) * Math.PI * 2;
            return (
              <div key={p.name} className="absolute" style={{ left: `${50 + 46 * Math.cos(a)}%`, top: `${50 + 46 * Math.sin(a)}%`, transform: "translate(-50%,-50%)" }}>
                <div className="orbit-counter">
                  <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold shadow-card">
                    <span className="size-2.5 rounded-full" style={{ background: p.mono ? "var(--ink)" : `hsl(${p.hue} 75% 50%)` }} />{p.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Final call to action ---------- */
export function CtaBand() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal className="gold-frame relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-[radial-gradient(90%_120%_at_50%_0%,rgb(245_167_66/0.20),transparent_60%),radial-gradient(70%_90%_at_100%_100%,rgb(224_96_154/0.18),transparent_60%)] px-6 py-14 text-center sm:px-12">
        <div className="lotus-pattern pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="gold-rule relative mx-auto mb-6 w-24" aria-hidden />
        <h2 className="relative text-[30px] leading-tight text-balance sm:text-[40px]">Ready to grow? Let&apos;s plan your shop together.</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-[15.5px] text-muted">A free 30-minute call. We look at your listings, ads and prices and tell you the three changes that would help most.</p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <GlowButton href="#enquiry">Get a free growth plan</GlowButton>
          {SITE.contact.whatsapp && <a href={waHref("Hi, I'd like to grow my online shop.")} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 text-[14.5px] font-semibold text-accent hover:bg-raised">WhatsApp us</a>}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- What a seller needs before we start ---------- */
const CHECK_ICON: Record<CheckId, React.ComponentType<{ className?: string }>> = {
  gst: ReceiptText, pan: IdCard, bank: Banknote, fssai: UtensilsCrossed, own_contact: Smartphone, address: MapPin, photos: CameraIcon, team_access: KeyRound,
};
export function SellerChecklistSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead id="checklist" eyebrow="BEFORE WE START" title="What your shop needs" accent="to sell online" body="Keep these ready. Your accounts stay in your own name — we only help you run them." />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SELLER_CHECKLIST.map((c, i) => {
          const Icon = CHECK_ICON[c.id];
          return (
            <Reveal key={c.id} delay={i * 50}>
              <Spotlight className="h-full rounded-3xl"><div className="flex h-full flex-col rounded-3xl border border-line bg-surface/70 p-5">
                <div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-ai-soft text-ai"><Icon className="size-5" /></span><span className="em-s text-[28px] leading-none">{String(i + 1).padStart(2, "0")}</span></div>
                <p className="mt-4 text-[15px] font-semibold">{c.title}</p>
                <p className="mt-1 text-[12.5px] font-medium text-accent">{c.short}</p>
                <p className="mt-2 text-[13px] text-muted">{c.why}</p>
              </div></Spotlight>
            </Reveal>
          );
        })}
      </div>
      <Reveal className="mt-6">
        <div className="gold-frame grid gap-5 rounded-3xl border border-line bg-surface p-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-[17px] font-semibold"><ShieldCheck className="size-5 text-pos" />Your shop, your name, your number</p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted">
              {[
                "Your Amazon, Flipkart and Meesho accounts are opened in your name, with your own mobile number, GST, PAN and bank account.",
                "Sale money goes straight to your bank — never through us.",
                "You add our team as a user from your seller panel. You never share your password or OTP, and you can remove us any time.",
                "Our team can fill every form for you — you only share documents and read out the OTP once when the account is opened.",
              ].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pos" />{t}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-raised p-5">
            <p className="text-[14px] font-semibold">No GST yet?</p>
            <p className="mt-1 text-[13.5px] text-muted">You can start on Meesho with a free GST Enrolment ID (selling within your own state), plus Instagram and WhatsApp. We help you get GST for Amazon and Flipkart.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/seller-checklist" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold hover:border-accent">Printable checklist <ArrowUpRight className="size-4" /></Link>
              <a href={waHref(`Hi ${SITE.company}, I'd like to start selling online. Here is what I have ready:`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#0b8a5f] px-4 py-2 text-[13px] font-semibold text-white">Send on WhatsApp <ArrowRight className="size-4" /></a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
