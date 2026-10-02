import { BookOpen, Brain, ChevronUp, FilePen, FilePlus, FlaskConical, Image, Loader2, Play, ScanEye, Search, Wrench, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ActionKind, AgentAction } from "@/lib/workspace-types";

export const actionIcon: Record<ActionKind, LucideIcon> = {
  read: BookOpen, search: Search, edit: FilePen, create: FilePlus, run: Play, asset: Image,
  test: FlaskConical, inspect: ScanEye, fix: Wrench, think: Brain,
};

export function ActionRow({ action }: { action: AgentAction }) {
  const Icon = action.status === "running" ? Loader2 : action.status === "failed" ? X : actionIcon[action.kind];
  const tone = action.status === "running" ? "text-warning" : action.status === "failed" ? "text-destructive" : action.status === "pending" ? "text-warning/70" : "text-muted-foreground";
  return (
    <div className={`flex h-9 min-w-0 items-center gap-2.5 rounded-[6px] border px-2.5 ${action.status === "failed" ? "border-destructive/40" : action.status === "running" ? "border-primary/60" : "border-border"} bg-card`}>
      <Icon className={`!h-4 !w-4 shrink-0 ${tone} ${action.status === "running" ? "animate-spin" : ""}`} />
      <span className={`shrink-0 text-[13px] font-medium ${action.status === "pending" ? "text-muted-foreground/60" : ""}`}>{action.title}</span>
      {action.target && <span className="min-w-0 truncate text-[12px] text-muted-foreground">{action.target}</span>}
      {action.status === "failed" && <span className="ml-auto shrink-0 text-[11px] font-bold text-destructive">Failed</span>}
    </div>
  );
}

export function ActionGroup({ actions }: { actions: AgentAction[] }) {
  const [open, setOpen] = useState(false);
  const running = actions.some((a) => a.status === "running");
  const failed = actions.filter((a) => a.status === "failed").length;
  const chips = actions.length > 6 ? [...actions.slice(0, 4), null, actions[actions.length - 1]] : actions;
  if (open) {
    return (
      <div className="grid gap-1.5">
        <button type="button" onClick={() => setOpen(false)} aria-expanded className="flex h-8 w-fit items-center gap-2 rounded-[6px] px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ChevronUp className="!h-4 !w-4" /> Show less
        </button>
        {actions.map((a) => <ActionRow key={a.id} action={a} />)}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="flex h-9 w-fit max-w-full items-center gap-2.5 rounded-[6px] text-[13px] font-medium text-muted-foreground hover:text-foreground">
      <span className="flex items-center gap-1">
        {chips.map((a, i) => {
          const Icon = a ? (a.status === "running" ? Loader2 : actionIcon[a.kind]) : null;
          return (
            <i key={a?.id ?? `more${i}`} className={`grid h-7 w-7 place-items-center rounded-[5px] border ${a?.status === "failed" ? "border-destructive/50 text-destructive" : a?.status === "running" ? "border-primary text-primary" : "border-border"}`}>
              {Icon ? <Icon className={`!h-3.5 !w-3.5 ${a?.status === "running" ? "animate-spin" : ""}`} /> : <span className="text-[11px] leading-none">•••</span>}
            </i>
          );
        })}
      </span>
      <span className="whitespace-nowrap">{actions.length} actions{failed > 0 && !running ? <span className="text-destructive"> · {failed} fixed</span> : null}</span>
    </button>
  );
}
