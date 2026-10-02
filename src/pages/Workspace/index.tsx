import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ListChecks, MoreHorizontal, PanelLeft, RotateCw, Shapes } from "lucide-react";
import { useState } from "react";
import { AppDrawer } from "@/components/AppDrawer";
import { Header, HeaderIcon } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Categories } from "@/components/workspace/Categories";
import { ChatView } from "@/components/workspace/ChatView";
import { PreviewView, SettingsView, TasksSheet } from "@/components/workspace/Panels";
import { ProjectMenu } from "@/components/workspace/ProjectMenu";
import { projectName as nameFor, projectSlug } from "@/lib/projects";
import { seedChat, type ChatItem } from "@/lib/workspace-data";


type Mode = "chat" | "preview" | "settings";

export function Workspace() {
  const { projectId } = useParams({ from: "/project/$projectId" });
  return <WorkspaceInner key={projectId} projectId={projectId} />;
}

function WorkspaceInner({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState(nameFor(projectId));
  // New/unknown projects start empty; known projects show a populated history.
  const [items, setItems] = useState<ChatItem[]>(() => (nameFor(projectId) !== projectId ? seedChat() : []));
  const [mode, setMode] = useState<Mode>("chat");
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tools, setTools] = useState(false);
  const [tasks, setTasks] = useState(false);
  const [previewPath, setPreviewPath] = useState("/");
  const [previewReload, setPreviewReload] = useState(0);
  const hasPreview = items.some((i) => i.type === "checkpoint");

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <AppDrawer open={drawer} onClose={() => setDrawer(false)} onNew={() => void navigate({ to: "/dashboard" })} onOpenProject={(p) => { setDrawer(false); if (p) void navigate({ to: "/project/$projectId", params: { projectId: projectSlug(p) } }); }} />
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
        {mode === "chat" && <ChatView items={items} setItems={setItems} />}
         {mode === "preview" && <PreviewView hasPreview={hasPreview} projectName={name} path={previewPath} reloadKey={previewReload} onBack={() => setMode("chat")} />}
        {mode === "settings" && <SettingsView name={name} setName={setName} />}
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
            <Button type="button" variant="outline" onClick={() => setMode("preview")} className="h-10 min-w-0 truncate rounded-[12px] border-cta bg-cta px-3 text-[14px] font-bold text-cta-foreground shadow-[0_16px_40px_-20px_var(--primary)] hover:bg-cta/90 hover:text-cta-foreground">Open Preview</Button>
            <Button type="button" variant="outline" size="icon" aria-label="Tasks" title="Tasks" onClick={() => setTasks(true)} className="h-10 w-10 rounded-[12px] bg-card font-semibold"><ListChecks className="!h-4 !w-4" /></Button>
          </>}
      </footer>

       {menu && <ProjectMenu name={name} setName={setName} onClose={() => setMenu(false)} onSettings={() => { setMenu(false); setMode("settings"); }} />}
       {tools && <Categories onClose={() => setTools(false)} />}
      {tasks && <TasksSheet onClose={() => setTasks(false)} />}
    </div>
  );
}
