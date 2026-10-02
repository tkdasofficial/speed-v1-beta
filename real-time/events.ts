// Delta event contract shared by server publisher and client sync engine.
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type Project = { id: string; slug: string; name: string; settings: Record<string, Json>; updatedAt: string; version: number };
export type Message = { id: string; projectId: string; role: "user" | "assistant" | "system"; content: string; createdAt: string; version: number };
export type Task = { id: string; projectId: string; title: string; description: string; status: string; version: number };
export type Profile = { email: string; displayName: string | null; avatarUrl: string | null; version: number };
export type StateEntry = { key: string; value: Json; version: number };

export type EntityMap = { project: Project; message: Message; task: Task; profile: Profile; state: StateEntry };
export type Entity = keyof EntityMap;

export type SyncEvent = {
  [K in Entity]: { seq: number; entity: K; op: "upsert" | "delete"; id: string; version: number; data: EntityMap[K] | null };
}[Entity];

export type Snapshot = {
  seq: number;
  projects: Project[];
  tasks: Task[];
  profile: Profile;
  state: StateEntry[];
};
