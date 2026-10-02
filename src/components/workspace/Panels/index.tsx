import { AlertTriangle, Check, Loader2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Task } from "@/lib/workspace-types";
import { useServerFn } from "@tanstack/react-start";
import { useTasks } from "@/lib/sync";
import { createTask, deleteTask, updateTask } from "@/lib/sync/sync.functions";

export function PreviewView({ hasPreview, projectName, path, reloadKey, onBack }: { hasPreview: boolean; projectName: string; path: string; reloadKey: number; onBack: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (!hasPreview) return;
    setState("loading");
    const timer = window.setTimeout(() => setState("ready"), 700);
    return () => window.clearTimeout(timer);
  }, [hasPreview, path, reloadKey]);
  if (!hasPreview) {
    return <Empty icon={Smartphone} title="No preview yet" body="Ask the agent to build something and the running app will appear here." action="Back to chat" onAction={onBack} />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state === "loading" && <div className="grid h-full place-items-center text-[13px] text-muted-foreground"><span className="flex items-center gap-2"><Loader2 className="!h-4 !w-4 animate-spin text-primary" /> Starting preview…</span></div>}
        {state === "error" && <Empty icon={AlertTriangle} tone="destructive" title="Preview failed to load" body="The app stopped responding. Reload, or ask the agent to fix it." action="Back to chat" onAction={onBack} />}
        {state === "ready" && <Empty icon={Smartphone} title="Preview unavailable" body={`${projectName} has no running app at ${path} yet.`} action="Back to chat" onAction={onBack} />}
      </div>
    </div>
  );
}

export function SettingsView({ name, setName }: { name: string; setName: (n: string) => void }) {
  const [model, setModel] = useState("Free");
  const [autoCheck, setAutoCheck] = useState(true);
  const [plan, setPlan] = useState(false);
  const [vis, setVis] = useState("Private");
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid max-w-2xl gap-5 p-4">
        <Section title="Project">
          <label className="grid gap-1 text-[12px] text-muted-foreground">Name<input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-[14px] border border-border bg-gradient-to-b from-card to-background px-3 text-[14px] text-foreground outline-none focus:border-primary" /></label>
          <Seg label="Visibility" value={vis} options={["Private", "Public"]} onChange={setVis} />
        </Section>
        <Section title="Model">
          <Seg label="Default model" value={model} options={["Free", "Balanced", "Power"]} onChange={setModel} />
        </Section>
        <Section title="Build preferences">
          <Toggle label="Run checks after every change" on={autoCheck} set={setAutoCheck} />
          <Toggle label="Start in Plan mode" on={plan} set={setPlan} />
        </Section>
        <Section title="Danger zone">
          <button type="button" className="h-10 rounded-[12px] border border-destructive/50 text-[14px] font-semibold text-destructive">Delete project</button>
        </Section>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-2"><h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>{children}</section>
);
function Seg({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-gradient-to-b from-card to-background p-2 pl-3">
      <span className="text-[14px]">{label}</span>
      <div className="flex gap-1">{options.map((o) => <button key={o} type="button" onClick={() => onChange(o)} className={`h-7 rounded-[9px] px-2.5 text-[12px] font-medium ${o === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{o}</button>)}</div>
    </div>
  );
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex h-11 items-center justify-between rounded-[14px] border border-border bg-gradient-to-b from-card to-background px-3 text-left text-[14px]">
      {label}<span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${on ? "justify-end bg-primary" : "justify-start bg-accent"}`}><i className="h-4 w-4 rounded-full bg-foreground" /></span>
    </button>
  );
}

function Empty({ icon: Icon, title, body, action, onAction, tone }: { icon: typeof Check; title: string; body: string; action: string; onAction: () => void; tone?: "destructive" }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className={`grid h-12 w-12 place-items-center rounded-[12px] border ${tone ? "border-destructive/50 bg-destructive/15 text-destructive" : "border-primary/45 bg-primary/20"}`}><Icon className="!h-5 !w-5" /></span>
      <h3 className="mb-2 mt-5 text-[24px] font-extrabold tracking-[-0.03em]">{title}</h3>
      <p className="m-0 max-w-xs text-[13px] text-muted-foreground">{body}</p>
      <button type="button" onClick={onAction} className="mt-4 h-9 rounded-[12px] border border-border px-4 text-[13px] font-semibold">{action}</button>
    </div>
  );
}

export function TasksSheet({ onClose, projectId }: { onClose: () => void; projectId: string | undefined }) {
  const live = useTasks(projectId);
  const tasks: Task[] = live.map((t) => ({ id: t.id, title: t.title, desc: t.description, status: t.status as Task["status"] }));
  const add = useServerFn(createTask);
  const upd = useServerFn(updateTask);
  const del = useServerFn(deleteTask);
  const [draft, setDraft] = useState("");
  const move = (id: string, status: Task["status"] | null) => void (status ? upd({ data: { id, status } }) : del({ data: { id } }));
  const groups: { key: Task["status"]; label: string; empty: string }[] = [
    { key: "ready", label: "Ready", empty: "No tasks waiting for review" },
    { key: "active", label: "Active", empty: "No running tasks" },
    { key: "draft", label: "Draft", empty: "No planned tasks" },
  ];
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div className="grid h-12 shrink-0 grid-cols-[40px_1fr_40px] items-center border-b border-border px-2">
        <span /><b className="text-center text-[15px] font-bold">Tasks</b>
        <button type="button" aria-label="Close tasks" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[12px] hover:bg-accent"><X className="!h-5 !w-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-2xl gap-5 p-3">
          {groups.map((g) => {
            const list = tasks.filter((t) => t.status === g.key);
            return (
              <section key={g.key} className="grid gap-1.5">
                <h3 className="m-0 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{g.label} · {list.length}</h3>
                {list.length === 0 && <p className="m-0 rounded-[14px] border border-dashed border-border p-3 text-[13px] text-muted-foreground">{g.empty}</p>}
                {list.map((t) => (
                  <div key={t.id} className="grid gap-2 rounded-[16px] border border-border bg-gradient-to-b from-card to-background p-4 transition hover:border-foreground/25">
                    <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><b className="block text-[14px] font-semibold">{t.title}</b><small className="block text-[12px] text-muted-foreground">{t.desc}</small></div>
                      {g.key === "active" && <Loader2 className="!h-4 !w-4 animate-spin text-primary" />}</div>
                    {t.progress !== undefined && <div className="h-1 overflow-hidden rounded-[2px] bg-accent"><div className="h-full bg-primary" style={{ width: `${t.progress}%` }} /></div>}
                    <div className="flex gap-1.5">
                      {g.key === "ready" && <><Btn primary onClick={() => move(t.id, null)}>Apply</Btn><Btn onClick={() => {}}>Review</Btn></>}
                      {g.key === "active" && <Btn danger onClick={() => move(t.id, "draft")}>Cancel</Btn>}
                      {g.key === "draft" && <Btn primary onClick={() => move(t.id, "active")}>Start</Btn>}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!draft.trim() || !projectId) return; void add({ data: { projectId, title: draft.trim(), description: "New draft task" } }); setDraft(""); }} className="flex shrink-0 gap-2 border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New task…" className="h-10 min-w-0 flex-1 rounded-[14px] border border-border bg-gradient-to-b from-card to-background px-3 text-[14px] outline-none focus:border-primary" />
        <button type="submit" disabled={!draft.trim()} className="h-10 rounded-[12px] bg-cta px-4 text-[14px] font-semibold text-cta-foreground disabled:bg-accent disabled:text-muted-foreground">Add</button>
      </form>
    </div>
  );
}
const Btn = ({ children, onClick, primary, danger }: { children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean }) => (
  <button type="button" onClick={onClick} className={`h-8 rounded-[12px] px-3 text-[13px] font-semibold ${primary ? "bg-cta text-cta-foreground" : danger ? "border border-destructive/50 text-destructive" : "border border-border"}`}>{children}</button>
);
