export type ActionKind = "read" | "search" | "edit" | "create" | "run" | "asset" | "test" | "inspect" | "fix" | "think";
export type ActionStatus = "done" | "running" | "failed" | "pending";
export type AgentAction = { id: string; kind: ActionKind; title: string; target?: string | undefined; status: ActionStatus };

export type ChatItem =
  | { id: string; type: "user"; text: string; time: string }
  | { id: string; type: "ai"; text: string }
  | { id: string; type: "actions"; actions: AgentAction[] }
  | { id: string; type: "status"; text: string; state: "running" | "done" | "failed" }
  | { id: string; type: "checkpoint"; text: string };

let n = 0;
export const uid = () => `i${Date.now().toString(36)}${(n++).toString(36)}`;

export type Task = { id: string; title: string; desc: string; status: "ready" | "active" | "draft"; progress?: number | undefined };
export type FileNode = { name: string; path: string; type: "folder" | "file"; children?: FileNode[] };
export type ChangedFile = { path: string; change: "A" | "M" | "D" };
