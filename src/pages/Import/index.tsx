import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Figma, FolderUp, Github, Loader2, Lock, Globe, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageShell, StateBox } from "@/components/PageShell";
import "@/style/Import/index.css";


function Bitbucket() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3.5a.7.7 0 0 0-.7.8l2.7 16.4a1 1 0 0 0 1 .8h12.1a.7.7 0 0 0 .7-.6l2.9-16.6a.7.7 0 0 0-.7-.8zm11.2 11.6H9.9L8.8 8.9h6.5z" /></svg>;
}

type SourceId = "github" | "bitbucket" | "figma" | "files";
const sources: { id: SourceId; name: string; desc: string; icon: typeof Github }[] = [
  { id: "github", name: "GitHub", desc: "Import an existing GitHub repository.", icon: Github },
  { id: "bitbucket", name: "Bitbucket", desc: "Import an existing Bitbucket repository.", icon: Bitbucket as unknown as typeof Github },
  { id: "figma", name: "Design Source", desc: "Import frames from a Figma file.", icon: Figma },
  { id: "files", name: "Existing Project / Files", desc: "Upload a ZIP or project folder.", icon: FolderUp },
];
type RemoteItem = { name: string; owner: string; priv: boolean; updated: string };
const repos: RemoteItem[] = [];
const figmaFiles: RemoteItem[] = [];

type Step = "sources" | "connecting" | "select" | "importing" | "success" | "error" | "cancelled";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ImportPage() {
  const nav = useNavigate();
  const [src, setSrc] = useState<SourceId | null>(null);
  const [step, setStep] = useState<Step>("sources");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [files, setFiles] = useState<{ name: string; size: number; count: number } | null>(null);
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const zip = useRef<HTMLInputElement>(null);
  const dir = useRef<HTMLInputElement>(null);
  const source = sources.find((s) => s.id === src);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const choose = (id: SourceId) => { setSrc(id); setPick(null); setFiles(null); setQ(""); if (id === "files") return setStep("select"); setStep("connecting"); };
  const reset = () => { if (timer.current) clearInterval(timer.current); setSrc(null); setStep("sources"); setPct(0); };
  const start = () => {
    setStep("importing"); setPct(0);
    const fail = pick === "nexus-gateway";
    timer.current = setInterval(() => setPct((p) => {
      const n = p + 7 + Math.random() * 10;
      if (fail && n > 55) { clearInterval(timer.current!); setStep("error"); return p; }
      if (n >= 100) { clearInterval(timer.current!); setStep("success"); return 100; }
      return n;
    }), 220);
  };
  const cancel = () => { if (timer.current) clearInterval(timer.current); setStep("cancelled"); };
  const projectName = pick ?? files?.name.replace(/\.zip$/i, "") ?? "project";
  const list = (src === "figma" ? figmaFiles : repos).filter((r) => `${r.name} ${r.owner}`.toLowerCase().includes(q.toLowerCase()));
  const phaseLabel = pct < 30 ? "Fetching files" : pct < 65 ? "Analyzing project" : pct < 90 ? "Installing dependencies" : "Finishing setup";

  return (
    <PageShell title="Import" sub={step === "sources" ? "Bring an existing project into Speed." : source ? `From ${source.name}` : undefined}>
      {step === "sources" && (
        <ul className="sp-list">
          {sources.map((s) => { const I = s.icon; return (
            <li key={s.id} className="sp-row">
              <button className="sp-row-main" onClick={() => choose(s.id)}>
                <span className="sp-ico"><I /></span>
                <span className="sp-row-text"><b>{s.name}</b><span>{s.desc}</span></span>
              </button>
              <div className="sp-row-action"><button className="sp-btn" onClick={() => choose(s.id)}>Continue <ArrowRight /></button></div>
            </li>
          ); })}
        </ul>
      )}

      {step === "connecting" && source && (
        <StateBox title={`Connect ${source.name}`} text={`Authorize Speed to read your ${src === "figma" ? "design files" : "repositories"}. Nothing is changed in your account.`}>
          <button className="sp-btn" onClick={reset}>Back</button>
          <ConnectButton onDone={() => setStep("select")} />
        </StateBox>
      )}

      {step === "select" && src !== "files" && (<>
        <label className="sp-search is-inline"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={src === "figma" ? "Search files" : "Search repositories"} aria-label="Search repositories" /></label>
        {list.length === 0 ? <StateBox title="No repositories found" text={`Nothing matches "${q}".`} /> : (
          <ul className="sp-list">
            {list.map((r) => (
              <li key={r.name} className={`sp-row ${pick === r.name ? "is-picked" : ""}`}>
                <button className="sp-row-main" onClick={() => setPick(r.name)} aria-pressed={pick === r.name}>
                  <span className="sp-ico">{r.priv ? <Lock /> : <Globe />}</span>
                  <span className="sp-row-text"><b>{r.name}</b><em>{r.owner} · {r.priv ? "Private" : "Public"} · {r.updated}</em></span>
                  {pick === r.name && <Check className="sp-check" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="sp-footer"><button className="sp-btn" onClick={reset}>Back</button><button className="sp-btn is-primary" disabled={!pick} onClick={start}>Import</button></div>
      </>)}

      {step === "select" && src === "files" && (<>
        <div className="sp-drop">
          {files ? (<div className="sp-file"><span className="sp-ico"><FolderUp /></span><span className="sp-row-text"><b>{files.name}</b><em>{files.count} file{files.count === 1 ? "" : "s"} · {(files.size / 1024).toFixed(1)} KB</em></span><button className="sp-icon-btn" onClick={() => setFiles(null)} aria-label="Remove"><X /></button></div>)
            : (<><b>Select a project to import</b><p>ZIP archive or a project folder.</p><div className="sp-state-actions"><button className="sp-btn" onClick={() => zip.current?.click()}>Choose ZIP</button><button className="sp-btn" onClick={() => dir.current?.click()}>Choose folder</button></div></>)}
        </div>
        <div className="sp-footer"><button className="sp-btn" onClick={reset}>Back</button><button className="sp-btn is-primary" disabled={!files} onClick={start}>Import</button></div>
        <input ref={zip} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFiles({ name: f.name, size: f.size, count: 1 }); }} />
        <input ref={dir} type="file" hidden multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) setFiles({ name: fs[0]!.webkitRelativePath.split("/")[0] || "folder", size: fs.reduce((a, f) => a + f.size, 0), count: fs.length }); }} />
      </>)}

      {step === "importing" && (
        <div className="sp-state" role="status">
          <b>Importing {projectName}</b>
          <p>{phaseLabel}… {Math.round(pct)}%</p>
          <div className="sp-progress"><span style={{ width: `${pct}%` }} /></div>
          <div className="sp-state-actions"><button className="sp-btn" onClick={cancel}>Cancel</button></div>
        </div>
      )}
      {step === "success" && (
        <StateBox title="Import complete" text={`${projectName} is ready in your Library.`}>
          <button className="sp-btn" onClick={reset}>Import another</button>
          <button className="sp-btn is-primary" onClick={() => nav({ to: "/project/$projectId", params: { projectId: slug(projectName) } })}>Open Project</button>
        </StateBox>
      )}
      {step === "error" && (
        <StateBox tone="error" title="Import failed" text={`We couldn't read ${projectName}. The repository may be too large or access was revoked.`}>
          <button className="sp-btn" onClick={() => setStep("select")}>Back</button>
          <button className="sp-btn is-primary" onClick={start}>Retry</button>
        </StateBox>
      )}
      {step === "cancelled" && (
        <StateBox title="Import cancelled" text="No files were added to your Library.">
          <button className="sp-btn" onClick={reset}>Back to sources</button>
          <button className="sp-btn is-primary" onClick={start}>Restart import</button>
        </StateBox>
      )}
    </PageShell>
  );
}

function ConnectButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <button className="sp-btn is-primary" disabled={busy} onClick={() => { setBusy(true); setTimeout(onDone, 1000); }}>{busy ? <><Loader2 className="animate-spin" /> Connecting</> : "Authorize"}</button>;
}
