import { useNavigate } from "@tanstack/react-router";
import { AppWindow, ArrowDownUp, Code2, LayoutDashboard, MoreVertical, Plus, Server, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell, SkeletonRows, StateBox } from "@/components/PageShell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "@/style/Library/index.css";


type Kind = "Web App" | "Mobile App" | "Landing Page" | "Dashboard" | "API" | "Other";
type Project = { id: string; name: string; desc: string; kind: Kind; modified: number; status: "Live" | "Draft" | "Building" };
const icons: Record<Kind, typeof AppWindow> = { "Web App": AppWindow, "Mobile App": Smartphone, "Landing Page": AppWindow, Dashboard: LayoutDashboard, API: Server, Other: Code2 };
const H = 3600_000;
const now = Date.now();
const seed: Project[] = [
  { id: "p1", name: "WebsiteToApk", desc: "Convert eSports PlayGround site to an Expo app", kind: "Mobile App", modified: now - 0.2 * H, status: "Building" },
  { id: "p2", name: "Hyper Copilot", desc: "Agent workspace with task routing", kind: "Web App", modified: now - 3 * H, status: "Live" },
  { id: "p3", name: "Stellar Dashboard", desc: "Revenue and cohort analytics", kind: "Dashboard", modified: now - 26 * H, status: "Live" },
  { id: "p4", name: "Pulse Commerce", desc: "Storefront launch page", kind: "Landing Page", modified: now - 72 * H, status: "Draft" },
  { id: "p5", name: "Nexus API", desc: "REST gateway with auth and rate limits", kind: "API", modified: now - 150 * H, status: "Live" },
  { id: "p6", name: "Elite Veo", desc: "Video generation settings and profile", kind: "Web App", modified: now - 400 * H, status: "Draft" },
];
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); if (m < 60) return `${Math.max(m, 1)}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; return `${Math.round(h / 24)}d ago`; };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
type Sort = "recent" | "name";

export function LibraryPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [kind, setKind] = useState<Kind | "All">("All");
  const [rename, setRename] = useState<Project | null>(null);
  const [draft, setDraft] = useState("");
  const [del, setDel] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = (fail = false) => { setPhase("loading"); setTimeout(() => { if (fail) return setPhase("error"); setItems((p) => (p.length ? p : seed)); setPhase("ready"); }, 600); };
  useEffect(() => load(), []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((p) => (kind === "All" || p.kind === kind) && (!s || `${p.name} ${p.desc} ${p.kind}`.toLowerCase().includes(s)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.modified - a.modified));
  }, [items, q, sort, kind]);

  const open = (p: Project) => nav({ to: "/project/$projectId", params: { projectId: slug(p.name) } });
  const duplicate = (p: Project) => setItems((xs) => [{ ...p, id: `p${Date.now()}`, name: `${p.name} copy`, modified: Date.now(), status: "Draft" }, ...xs]);
  const create = () => { const n = newName.trim(); if (!n) return; setItems((xs) => [{ id: `p${Date.now()}`, name: n, desc: "New project", kind: "Web App", modified: Date.now(), status: "Draft" }, ...xs]); setNewName(""); setCreating(false); };

  const filterMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className="sp-icon-btn" aria-label="Sort and filter"><ArrowDownUp /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <DropdownMenuRadioItem value="recent">Last modified</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Type</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={kind} onValueChange={(v) => setKind(v as Kind | "All")}>
          {(["All", "Web App", "Mobile App", "Landing Page", "Dashboard", "API"] as const).map((k) => <DropdownMenuRadioItem key={k} value={k}>{k}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setItems([]); }}>Preview empty state</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setItems([]); load(true); }}>Preview error state</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <PageShell title="Library" search={q} onSearch={setQ} actions={filterMenu}>
      {phase === "ready" && (
        <div className="sp-toolbar">
          <span>{q ? `${list.length} results` : `${items.length} projects`}</span>
          <button className="sp-btn is-primary" onClick={() => setCreating(true)}><Plus /> New Project</button>
        </div>
      )}
      {phase === "loading" && <SkeletonRows />}
      {phase === "error" && <StateBox tone="error" title="Couldn't load your projects" text="Check your connection and try again."><button className="sp-btn is-primary" onClick={() => load()}>Retry</button></StateBox>}
      {phase === "ready" && items.length === 0 && <StateBox title="No projects yet" text="Create a project or import an existing one to get started."><button className="sp-btn is-primary" onClick={() => setCreating(true)}><Plus /> New Project</button><button className="sp-btn" onClick={() => nav({ to: "/import" })}>Import</button></StateBox>}
      {phase === "ready" && items.length > 0 && list.length === 0 && <StateBox title="No matching projects" text={q ? `Nothing matches "${q}".` : "No projects of this type."}><button className="sp-btn" onClick={() => { setQ(""); setKind("All"); }}>Clear filters</button></StateBox>}
      {phase === "ready" && list.length > 0 && (
        <ul className="sp-list">
          {list.map((p) => { const I = icons[p.kind]; return (
            <li key={p.id} className="sp-row">
              <button className="sp-row-main" onClick={() => open(p)}>
                <span className="sp-ico"><I /></span>
                <span className="sp-row-text">
                  <b>{p.name}</b>
                  <em>{p.kind} · {ago(p.modified)}</em>
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="sp-icon-btn" aria-label={`Actions for ${p.name}`}><MoreVertical /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => open(p)}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRename(p); setDraft(p.name); }}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicate(p)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setDel(p)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ); })}
        </ul>
      )}

      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent className="sp-dialog">
          <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
          <input className="sp-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Project name" />
          <DialogFooter className="gap-2"><button className="sp-btn" onClick={() => setRename(null)}>Cancel</button><button className="sp-btn is-primary" disabled={!draft.trim()} onClick={() => { setItems((xs) => xs.map((x) => (x.id === rename?.id ? { ...x, name: draft.trim(), modified: Date.now() } : x))); setRename(null); }}>Save</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sp-dialog">
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <input className="sp-input" autoFocus placeholder="Project name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} aria-label="New project name" />
          <DialogFooter className="gap-2"><button className="sp-btn" onClick={() => setCreating(false)}>Cancel</button><button className="sp-btn is-primary" disabled={!newName.trim()} onClick={create}>Create</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent className="sp-dialog">
          <AlertDialogHeader><AlertDialogTitle>Delete {del?.name}?</AlertDialogTitle><AlertDialogDescription>This removes the project and its files. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setItems((xs) => xs.filter((x) => x.id !== del?.id))}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
