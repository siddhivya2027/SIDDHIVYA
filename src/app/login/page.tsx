"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, BarChart3, Palette, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandMark } from "@/components/shell/sidebar";
import { Button, Field, Input, Select } from "@/components/ui";
import { BRAND_DEFAULTS, DEMO_NOTICE } from "@/config/brand";
import { ROLE_LABEL, useStore, type Role } from "@/lib/store";
import { LiveLogin } from "@/components/live/live-login";
import { LIVE } from "@/lib/live/mode";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the name to show in the workspace").max(60),
  role: z.enum(["admin", "manager", "analyst", "viewer"]),
});
type Form = z.infer<typeof schema>;

const POINTS = [
  { icon: BarChart3, title: "One view of every channel", body: "Amazon, Flipkart and Meta performance, reconciled to the same definitions of revenue, ROAS, ACOS and TACOS." },
  { icon: Sparkles, title: "Recommendations with their working", body: "Each insight shows the numbers behind it, the suggested action and how it was calculated." },
  { icon: Palette, title: "Creative Studio built in", body: "Edit ad creatives from placement-sized templates and export them without leaving the workspace." },
];

export default function LoginPage() {
  return LIVE ? <LiveLogin /> : <DemoLogin />;
}

function DemoLogin() {
  const router = useRouter();
  const { session, hydrated, signIn, brand } = useStore();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "Ananya Rao", role: "admin" } });
  const enter = (v: Form) => {
    signIn({ name: v.name, role: v.role as Role, email: "demo.user@siddhivya.example" });
    router.push("/overview");
  };
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden border-b border-line bg-[radial-gradient(120%_80%_at_0%_0%,var(--accent-soft),transparent_60%),radial-gradient(90%_70%_at_100%_100%,var(--ai-soft),transparent_60%)] bg-surface px-6 py-8 sm:px-12 lg:border-r lg:border-b-0 lg:py-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`Back to the ${brand.productName} website`}>
          <BrandMark size={32} />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">{brand.productName}</p>
            <p className="text-[12px] text-faint">{brand.tagline}</p>
          </div>
        </Link>
        <div className="my-10 max-w-xl">
          <h1 className="text-[34px] leading-[1.12] font-semibold tracking-tight sm:text-[42px]">Every seller, every marketplace — <span className="text-accent">one clear view</span> of what to grow next.</h1>
          <ul className="mt-9 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><p.icon className="size-4" /></span>
                <span><span className="block text-[14.5px] font-semibold">{p.title}</span><span className="block text-[13.5px] text-muted">{p.body}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-faint">© {new Date().getFullYear()} {BRAND_DEFAULTS.companyLegal}{BRAND_DEFAULTS.poweredBy.name ? ` · Technology by ${BRAND_DEFAULTS.poweredBy.name}` : ""}</p>
      </section>
      <section className="flex items-center justify-center px-6 py-10 sm:px-12">
        <form onSubmit={handleSubmit(enter)} className="w-full max-w-sm" noValidate>
          <p className="text-[11.5px] font-semibold tracking-wide text-accent">DEMO ENVIRONMENT</p>
          <h2 className="mt-1 text-[22px] font-semibold">Enter the demo workspace</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">{DEMO_NOTICE} Three fictional client businesses are preloaded.</p>
          <div className="mt-6 space-y-4">
            <Field label="Your name" error={errors.name?.message}><Input {...register("name")} autoComplete="name" /></Field>
            <Field label="View the workspace as" hint="Roles change what you can do: viewers cannot edit campaigns or export reports.">
              <Select {...register("role")}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
            </Field>
            <Button type="submit" variant="primary" className="h-10 w-full" disabled={!hydrated}>Enter demo workspace<ArrowRight /></Button>
            {hydrated && session && <Button className="h-10 w-full" onClick={() => router.push("/overview")}>Continue as {session.name}</Button>}
            <p className="text-center text-[13px] text-muted">New seller? <Link href="/#enquiry" className="font-medium text-accent">Talk to us</Link> · <Link href="/" className="inline-flex items-center gap-0.5 hover:text-ink"><ArrowLeft className="size-3.5" />Website</Link></p>
          </div>
          <p className="mt-6 rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
            Demo entry does not check a password. Production sign-in (Auth.js, role-based access, tenant isolation) is specified in the project documentation and is not active in this build.
          </p>
        </form>
      </section>
    </div>
  );
}
