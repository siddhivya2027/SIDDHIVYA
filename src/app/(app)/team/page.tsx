"use client";
import { KeyRound, Plus, Power, UsersRound } from "lucide-react";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { TempPassword } from "@/components/live/temp-password";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { useSellers } from "@/lib/launch/state";
import { useStore } from "@/lib/store";

interface U { id: string; email: string; name: string; role: "owner" | "manager" | "seller"; clientId: string | null; active: boolean; createdAt: string; lastLoginAt: string | null; mustChange: boolean }
const ROLE = { owner: "Owner", manager: "Team member", seller: "Seller" } as const;

export default function TeamPage() {
  const me = useStore((s) => s.session);
  const sellers = useSellers();
  const [users, setUsers] = React.useState<U[] | null>(null);
  const [add, setAdd] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [temp, setTemp] = React.useState<{ name: string; email: string; password: string } | null>(null);
  const load = React.useCallback(async () => {
    const r = await fetch("/api/v1/users", { cache: "no-store" });
    const j = (await r.json()) as { users?: U[]; error?: string };
    if (!r.ok) { toast(j.error || "Could not load logins.", "error"); setUsers([]); return; }
    setUsers(j.users ?? []);
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const create = async () => {
    const r = await fetch("/api/v1/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, role: "manager" }) });
    const j = (await r.json()) as { tempPassword?: string; error?: string };
    if (!r.ok || !j.tempPassword) { toast(j.error || "Could not add.", "error"); return; }
    setTemp({ name, email, password: j.tempPassword }); setAdd(false); setName(""); setEmail(""); void load();
  };
  const act = async (u: U, action: "reset_password" | "deactivate" | "activate") => {
    if (action !== "activate" && !window.confirm(action === "reset_password" ? `Give ${u.name} a new temporary password?` : `Switch off ${u.name}'s login?`)) return;
    const r = await fetch(`/api/v1/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const j = (await r.json()) as { tempPassword?: string; error?: string };
    if (!r.ok) { toast(j.error || "Could not change it.", "error"); return; }
    if (j.tempPassword) setTemp({ name: u.name, email: u.email, password: j.tempPassword });
    void load();
  };
  return (
    <>
      <PageHeader title="Team & logins" description="Everyone who can sign in. Team members run the work; seller logins see only their own products, approvals and orders. Passwords are stored scrambled and are never shown again after creation." actions={<Button variant="primary" onClick={() => setAdd(true)}><Plus />Add team member</Button>} />
      <Card>
        <CardHeader title="Logins" subtitle="Seller logins are created from the Sellers page." />
        {!users ? <p className="px-5 pb-5 text-[13px] text-muted">Loading…</p> : users.length === 0 ? <EmptyState icon={<UsersRound />} title="No logins" /> : (
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.name} {u.email === me?.email && <Badge tone="accent">You</Badge>}</p>
                  <p className="text-muted">{u.email}{u.role === "seller" ? ` · ${sellers.find((c) => c.id === u.clientId)?.name ?? "seller"}` : ""} · last sign-in {u.lastLoginAt ? fmtDateTime(new Date(u.lastLoginAt).getTime()) : "never"}</p>
                </div>
                <Badge tone={u.role === "owner" ? "ai" : u.role === "manager" ? "accent" : "neutral"}>{ROLE[u.role as U["role"]]}</Badge>
                {!u.active && <Badge tone="neg">Switched off</Badge>}
                {u.mustChange && u.active && <Badge tone="warn">Temporary password</Badge>}
                {u.email !== me?.email && u.role !== "owner" && (
                  <>
                    <Button size="sm" onClick={() => void act(u, "reset_password")}><KeyRound />New password</Button>
                    <Button size="sm" variant="ghost" onClick={() => void act(u, u.active ? "deactivate" : "activate")}><Power />{u.active ? "Switch off" : "Switch on"}</Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={add} onOpenChange={setAdd} title="Add team member" description="They get a temporary password and choose their own at first sign-in." footer={<><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="primary" onClick={create} disabled={name.trim().length < 2 || !email.includes("@")}>Add</Button></>}>
        <div className="space-y-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
      </Modal>
      <TempPassword info={temp} onClose={() => setTemp(null)} />
    </>
  );
}
