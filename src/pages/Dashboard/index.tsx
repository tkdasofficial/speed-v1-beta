import { ChatInput } from "@/components/ChatInput";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FolderGit2,
  Gauge,
  Image,
  Globe2,
  Import,
  Layers3,
  Lightbulb,
  Library,
  Menu,
  Mic,
  MoreHorizontal,
  Pin,
  Presentation,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  ListChecks,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { AppDrawer, DesktopSidebar } from "@/components/AppDrawer";
import { projectSlug } from "@/lib/projects";
import { useServerFn } from "@tanstack/react-start";
import { useProjects } from "@/lib/sync";
import { createProject, sendMessage } from "@/lib/sync/sync.functions";
import "@/style/Dashboard/index.css";


type PreviewKind = "copilot" | "analytics" | "store" | "developer";

function ProjectPreview({ type }: { type: PreviewKind }) {
  return <span className={`project-thumb preview-${type}`} aria-hidden="true">
    <span className="preview-window">
      <span className="preview-top"><i /><i /><i /><em /></span>
      <span className="preview-body">
        <span className="preview-rail"><i /><i /><i /><i /></span>
        <span className="preview-content">
          <i className="preview-heading" />
          <span className="preview-feature"><i /><i /></span>
          <span className="preview-tiles"><i /><i /><i /></span>
          <i className="preview-line" />
        </span>
      </span>
    </span>
  </span>;
}

export function EvoAgent() {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const openProject = (name: string) => void navigate({ to: "/project/$projectId", params: { projectId: projectSlug(name) } });
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);

  const create = useServerFn(createProject);
  const send = useServerFn(sendMessage);
  const beginTask = async () => {
    const text = prompt.trim();
    if (!text || running) return;
    setRunning(true);
    try {
      const p = await create({ data: { name: text.slice(0, 40) } });
      await send({ data: { projectId: p.id, content: text } });
      setPrompt("");
      void navigate({ to: "/project/$projectId", params: { projectId: p.slug } });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not create the project");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="app-shell">
      <DesktopSidebar onNew={() => { setPrompt(""); setRunning(false); }} onOpenProject={openProject} />

      <div className="main-frame">

        <Home openProject={openProject} openDrawer={() => setDrawer(true)} prompt={prompt} setPrompt={setPrompt} beginTask={() => void beginTask()} />
      </div>

      <AppDrawer open={drawer} onClose={() => setDrawer(false)} onOpenProject={openProject} onNew={() => { setPrompt(""); setRunning(false); }} />
    </div>
  );
}

function Home({ openProject, openDrawer, prompt, setPrompt, beginTask }: { openProject: (name: string) => void; openDrawer: () => void; prompt: string; setPrompt: (v: string) => void; beginTask: () => void }) {
  const dashboardProjects = (useProjects() ?? []).map((p) => ({ name: p.name, slug: p.slug, kind: "Agent project", preview: "copilot" as PreviewKind }));
  return (
    <main className="home-page">
      <div className="home-inner">
         <div className="dashboard-mobile-head"><button onClick={openDrawer} aria-label="Open sidebar"><PanelLeft /></button><div className="mobile-brand"><b>SPEED</b></div><Link to="/faq" className="faq-lamp" aria-label="FAQ"><Lightbulb /></Link></div>

        <div className="ap-glow ap-glow-home" aria-hidden="true" />
        <h1>What are we working<br /><span className="ap-muted">on today?</span></h1>
        {dashboardProjects.length > 0 && <section className="projects-section" aria-labelledby="projects-heading">
          <div className="projects-head"><span id="projects-heading">Projects</span><button>Show all <ChevronRight /></button></div>
          <div className="project-scroll">
            {dashboardProjects.map((project) => (
              <button className="project-card" key={project.name} onClick={() => openProject(project.slug)}>
                 <ProjectPreview type={project.preview} />
                <span className="project-meta"><b>{project.name}</b><small>{project.kind}</small></span>
              </button>
            ))}
          </div>
        </section>}
        <div className="idea-list">
          <button onClick={() => setPrompt("Turn my notes into slides")}><Presentation className="coral" /> Turn my notes into slides</button>
          <button onClick={() => setPrompt("Analyze a Google Sheet")}><FileSpreadsheet className="green" /> Analyze a Google Sheet</button>
          <button onClick={() => setPrompt("Find three directions")}><Sparkles className="orange" /> Find three directions</button>
          <button onClick={() => setPrompt("Turn a sheet into a dashboard")}><BarChart3 className="blue" /> Turn a sheet into a dashboard</button>
        </div>
      </div>
      <div className="composer-wrap"><ChatInput value={prompt} onChange={setPrompt} onSend={() => beginTask()} busy={false} onStop={() => {}} placeholder="Start chatting or describe a task..." /></div>
    </main>
  );
}


