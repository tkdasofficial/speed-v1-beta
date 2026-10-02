import { Cloud, Database, Figma, Flame, Github, HardDrive, MessageSquare, Triangle, Globe, KeyRound, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell, StateBox } from "@/components/PageShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import "@/style/Integrations/index.css";


type Cat = "Development" | "Design" | "Storage" | "Database" | "Deployment" | "Productivity";
type Status = "idle" | "connecting" | "connected" | "auth" | "error";
type Integration = { id: string; name: string; desc: string; cat: Cat; icon: typeof Github; status: Status; verb: "Connect" | "Sign in" | "Enable" };
const seed: Integration[] = [
  { id: "github", name: "GitHub", desc: "Sync code, branches and pull requests", cat: "Development", icon: Github, status: "connected", verb: "Connect" },
  { id: "figma", name: "Figma", desc: "Import frames and design tokens", cat: "Design", icon: Figma, status: "idle", verb: "Connect" },
  { id: "gdrive", name: "Google Drive", desc: "Attach docs, sheets and assets", cat: "Storage", icon: HardDrive, status: "idle", verb: "Connect" },
  { id: "google", name: "Google", desc: "Add Google sign-in to your apps", cat: "Development", icon: Globe, status: "auth", verb: "Sign in" },
  { id: "supabase", name: "Supabase", desc: "Postgres database, auth and storage", cat: "Database", icon: Database, status: "idle", verb: "Connect" },
  { id: "firebase", name: "Firebase", desc: "Realtime database and hosting", cat: "Database", icon: Flame, status: "error", verb: "Connect" },
  { id: "vercel", name: "Vercel", desc: "Deploy previews and production builds", cat: "Deployment", icon: Triangle, status: "idle", verb: "Connect" },
  { id: "netlify", name: "Netlify", desc: "Static hosting and serverless functions", cat: "Deployment", icon: Cloud, status: "idle", verb: "Enable" },
  { id: "slack", name: "Slack", desc: "Send build and deploy notifications", cat: "Productivity", icon: MessageSquare, status: "idle", verb: "Sign in" },
];
const cats: (Cat | "All")[] = ["All", "Development", "Design", "Storage", "Database", "Deployment", "Productivity"];
const label: Record<Status, string> = { idle: "Not connected", connecting: "Connecting…", connected: "Connected", auth: "Authentication required", error: "Connection error" };

export function IntegrationsPage() {
  const [items, setItems] = useState(seed);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [cat, setCat] = useState<Cat | "All">("All");
  const [detail, setDetail] = useState<string | null>(null);

  const set = (id: string, status: Status) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
  const connect = (id: string) => { set(id, "connecting"); setTimeout(() => set(id, id === "firebase" && Math.random() < 0.5 ? "error" : "connected"), 1200); };
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return items.filter((i) => (tab === "all" || i.status === "connected") && (cat === "All" || i.cat === cat) && (!s || `${i.name} ${i.desc} ${i.cat}`.toLowerCase().includes(s))); }, [items, q, tab, cat]);
  const mine = items.filter((i) => i.status === "connected").length;
  const d = items.find((i) => i.id === detail);

  const action = (i: Integration) => {
    if (i.status === "connecting") return <button className="sp-btn" disabled><Loader2 className="animate-spin" /> Connecting</button>;
    if (i.status === "connected") return <button className="sp-btn is-danger" onClick={() => set(i.id, "idle")}>Disconnect</button>;
    if (i.status === "auth") return <button className="sp-btn is-primary" onClick={() => connect(i.id)}><KeyRound /> Sign in</button>;
    if (i.status === "error") return <button className="sp-btn" onClick={() => connect(i.id)}>Retry</button>;
    return <button className="sp-btn is-primary" onClick={() => connect(i.id)}>{i.verb}</button>;
  };

  return (
    <PageShell title="Integrations" search={q} onSearch={setQ}>
      <div className="sp-seg" role="tablist">
        <button role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>All Integrations</button>
        <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>Your Integrations <em>{mine}</em></button>
      </div>
      <label className="sp-select">
                <select value={cat} onChange={(e) => setCat(e.target.value as Cat | "All")}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      {list.length === 0 ? (
        <StateBox title={tab === "mine" && !q ? "No connected integrations" : "No matching integration found"} text={q ? `Nothing matches "${q}". Try another name or category.` : "Connect a service from All Integrations."}>
          <button className="sp-btn" onClick={() => { setQ(""); setCat("All"); setTab("all"); }}>Show all</button>
        </StateBox>
      ) : (
        <ul className="sp-list">
          {list.map((i) => { const I = i.icon; return (
            <li key={i.id} className="sp-row">
              <button className="sp-row-main" onClick={() => setDetail(i.id)}>
                <span className="sp-ico"><I /></span>
                <span className="sp-row-text"><b>{i.name}</b>{i.status === "idle" ? <span>{i.desc}</span> : <em><i className={`sp-status st-${i.status}`}>{label[i.status]}</i></em>}</span>
              </button>
              <div className="sp-row-action">{action(i)}</div>
            </li>
          ); })}
        </ul>
      )}
      <Sheet open={!!d} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="bottom" className="sp-sheet">
          {d && (<>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3"><span className="sp-ico"><d.icon /></span><div><SheetTitle>{d.name}</SheetTitle><SheetDescription>{d.desc}</SheetDescription></div></div>
            </SheetHeader>
            <dl className="sp-dl">
              <dt>Status</dt><dd><i className={`sp-status st-${d.status}`}>{label[d.status]}</i></dd>
              <dt>Category</dt><dd>{d.cat}</dd>
              <dt>Access</dt><dd>{d.status === "connected" ? "Read & write for all projects" : "—"}</dd>
            </dl>
            {d.status === "error" && <p className="sp-err">We couldn't reach {d.name}. Check permissions and retry.</p>}
            {d.status === "auth" && <p className="sp-err">Your {d.name} session expired. Sign in again to continue.</p>}
            <div className="sp-state-actions">{action(d)}</div>
          </>)}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
