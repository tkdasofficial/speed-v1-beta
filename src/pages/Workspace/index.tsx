import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ListChecks, MoreHorizontal, PanelLeft, RotateCw, Shapes } from "lucide-react";
import { useState } from "react";
import { AppDrawer, DesktopSidebar } from "@/components/AppDrawer";
import { Header, HeaderIcon } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Categories } from "@/components/workspace/Categories";
import { ChatView } from "@/components/workspace/ChatView";
import { PreviewView, SettingsView, TasksSheet } from "@/components/workspace/Panels";
import { ProjectMenu } from "@/components/workspace/ProjectMenu";
import { projectSlug } from "@/lib/projects";
import { useMessages, useProjects } from "@/lib/sync";
import { sendMessage, updateProject } from "@/lib/api/sync";
import type { ChatItem } from "@/lib/workspace-types";
import "@/style/Workspace/index.css";


type Mode = "chat" | "preview" | "settings";

export function Workspace() {
  const { projectId } = useParams({ from: "/_authenticated/project/$projectId" });
  return <WorkspaceInner key={projectId} projectId={projectId} />;
}

function WorkspaceInner({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const project = projects?.find((p) => p.slug === projectId);
  const name = project?.name ?? (projects ? "Project not found" : "");
  const rename = updateProject;
  const setName = (n: string) => { if (project && n.trim()) void rename({ data: { id: project.id, name: n.trim() } }); };
  const messages = useMessages(project?.id);
  const items: ChatItem[] = messages.map((m) => (m.role === "user"
    ? { id: m.id, type: "user", text: m.content, time: new Date(`${m.createdAt.replace(" ", "T")}Z`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
    : { id: m.id, type: "ai", text: m.content }));
  const send = sendMessage;
  const onSend = (text: string) => { if (project) void send({ data: { projectId: project.id, content: text } }); };
  const [mode, setMode] = useState<Mode>("chat");
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tools, setTools] = useState(false);
  const [tasks, setTasks] = useState(false);
  const [previewPath, setPreviewPath] = useState("/");
  const [previewReload, setPreviewReload] = useState(0);
  const hasPreview = items.some((i) => i.type === "checkpoint");
  const openProject = (projectName: string) => void navigate({ to: "/project/$projectId", params: { projectId: projectSlug(projectName) } });

  return (
    <div className="speed-workspace-shell text-foreground">
      <DesktopSidebar onNew={() => void navigate({ to: "/dashboard" })} onOpenProject={openProject} />
      <div className="speed-workspace-main">
      <AppDrawer open={drawer} onClose={() => setDrawer(false)} onNew={() => void navigate({ to: "/dashboard" })} onOpenProject={openProject} />
      <Header
        left={<HeaderIcon label="Open navigation" onClick={() => setDrawer(true)}><PanelLeft /></HeaderIcon>}
        title={name}
        onTitleClick={() => setMenu(!menu)}
        titleExpanded={menu}
        right={mode === "preview"
          ? <HeaderIcon label="Back to chat" onClick={() => setMode("chat")}><ArrowLeft /></HeaderIcon>
          : <HeaderIcon label="Back" onClick={() => void navigate({ to: "/dashboard" })}><ArrowLeft /></HeaderIcon>}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        {mode === "chat" && <ChatView items={items} onSend={onSend} />}
         {mode === "preview" && <PreviewView hasPreview={hasPreview} projectName={name} path={previewPath} reloadKey={previewReload} onBack={() => setMode("chat")} />}
        {mode === "settings" && <SettingsView projectId={project?.id} name={name} setName={setName} settings={project?.settings ?? {}} onSettings={(s) => { if (project) void rename({ data: { id: project.id, settings: s } }); }} />}
      </main>

       <footer className={`grid shrink-0 gap-2 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 ${mode === "preview" ? "grid-cols-[minmax(0,1fr)_40px_40px]" : "grid-cols-[40px_minmax(0,1fr)_40px]"}`}>
          {mode === "preview" ? <>
            <select value={previewPath} onChange={(e) => setPreviewPath(e.target.value)} aria-label="Preview path" className="h-10 min-w-0 rounded-[12px] border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {["/", "/login", "/dashboard"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button type="button" variant="outline" size="icon" aria-label="Reload preview" title="Reload preview" onClick={() => setPreviewReload((n) => n + 1)} className="h-10 w-10 rounded-[12px] bg-card font-semibold"><RotateCw className="!h-4 !w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="More preview options" title="More preview options" className="h-10 w-10 rounded-[12px] bg-card font-semibold"><MoreHorizontal className="!h-4 !w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="border-border bg-card text-foreground">
                <DropdownMenuItem onSelect={() => setPreviewPath("/")}>Go to home</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMode("chat")}>Back to chat</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </> : <>
            <Button type="button" variant="outline" size="icon" aria-label="Tools" title="Tools" onClick={() => setTools(true)} className="h-10 w-10 rounded-[12px] bg-card font-semibold"><Shapes className="!h-4 !w-4" /></Button>
            <Button type="button" variant="outline" onClick={() => setMode("preview")} className="workspace-preview-button h-10 min-w-0 truncate rounded-[10px] px-3 text-[14px] font-bold">Open Preview</Button>
            <Button type="button" variant="outline" size="icon" aria-label="Tasks" title="Tasks" onClick={() => setTasks(true)} className="h-10 w-10 rounded-[12px] bg-card font-semibold"><ListChecks className="!h-4 !w-4" /></Button>
          </>}
      </footer>

       {menu && <ProjectMenu name={name} setName={setName} onClose={() => setMenu(false)} onSettings={() => { setMenu(false); setMode("settings"); }} />}
       {tools && <Categories onClose={() => setTools(false)} />}
      {tasks && <TasksSheet projectId={project?.id} onClose={() => setTasks(false)} />}
      </div>
    </div>
  );
}
