// Live-data server functions: validate → authorize → write D1 → publish delta.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as v from "@security/validation";
import type { Json, Message, Profile, Project, Snapshot, StateEntry, Task } from "@realtime/events";

async function ctx() {
  const { requireUser } = await import("@security/authorize.server");
  const { d1 } = await import("@/lib/d1/d1.server");
  const { publish } = await import("@realtime/publish.server");
  return { me: await requireUser(), d1, publish };
}

type PRow = { id: string; slug: string; name: string; settings: string; updated_at: string; version: number };
const toProject = (r: PRow): Project => ({ id: r.id, slug: r.slug, name: r.name, settings: JSON.parse(r.settings || "{}"), updatedAt: r.updated_at, version: r.version });
type TRow = { id: string; project_id: string; title: string; description: string; status: string; version: number };
const toTask = (r: TRow): Task => ({ id: r.id, projectId: r.project_id, title: r.title, description: r.description, status: r.status, version: r.version });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "project";

export const getSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<Snapshot> => {
  const { me, d1 } = await ctx();
  const { latestSeq } = await import("@realtime/publish.server");
  const seq = await latestSeq(me.id);
  const [projects, tasks, prof, state] = await Promise.all([
    d1<PRow>("SELECT id, slug, name, settings, updated_at, version FROM projects WHERE owner_id = ? ORDER BY updated_at DESC", [me.id]),
    d1<TRow>("SELECT t.id, t.project_id, t.title, t.description, t.status, t.version FROM ai_tasks t JOIN projects p ON p.id = t.project_id WHERE p.owner_id = ? ORDER BY t.created_at", [me.id]),
    d1<{ version: number }>("SELECT version FROM profiles WHERE user_id = ?", [me.id]),
    d1<{ key: string; value: string; version: number }>("SELECT key, value, version FROM user_state WHERE user_id = ?", [me.id]),
  ]);
  return {
    seq,
    projects: projects.map(toProject),
    tasks: tasks.map(toTask),
    profile: { email: me.email, displayName: me.display_name, avatarUrl: me.avatar_url, version: prof[0]?.version ?? 1 },
    state: state.map((s) => ({ key: s.key, value: JSON.parse(s.value), version: s.version })),
  };
});

export const getChangesSince = createServerFn({ method: "GET" })
  .inputValidator((d) => v.since.parse(d))
  .handler(async ({ data }) => {
    const { me } = await ctx();
    const { changesSince } = await import("@realtime/publish.server");
    return changesSince(me.id, data.seq);
  });

export const getRealtimeTicket = createServerFn({ method: "POST" }).handler(async () => {
  const { me } = await ctx();
  const { mintRealtimeToken } = await import("@security/realtime-token.server");
  const url = process.env["REALTIME_URL"];
  if (!url) throw new Error("Real-time is not configured");
  return { url, token: await mintRealtimeToken(me.id) };
});

export const getEntitlementsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { me } = await ctx();
  const { getEntitlements } = await import("@security/entitlements.server");
  return getEntitlements(me.id);
});

// Projects
export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d) => v.projectCreate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const { assertCanCreateProject } = await import("@security/entitlements.server");
    await assertCanCreateProject(me.id);
    const base = slugify(data.name);
    const taken = new Set((await d1<{ slug: string }>("SELECT slug FROM projects WHERE owner_id = ? AND slug LIKE ?", [me.id, `${base}%`])).map((r) => r.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    const [row] = await d1<PRow>(
      "INSERT INTO projects (id, owner_id, slug, name) VALUES (?, ?, ?, ?) RETURNING id, slug, name, settings, updated_at, version",
      [crypto.randomUUID(), me.id, slug, data.name],
    );
    const p = toProject(row!);
    await publish(me.id, "project", "upsert", p.id, p.version, p);
    return p;
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator((d) => v.projectUpdate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const [cur] = await d1<PRow>("SELECT id, slug, name, settings, updated_at, version FROM projects WHERE id = ? AND owner_id = ?", [data.id, me.id]);
    if (!cur) throw new Error("Project not found");
    const settings = { ...JSON.parse(cur.settings || "{}"), ...(data.settings ?? {}) };
    const [row] = await d1<PRow>(
      "UPDATE projects SET name = ?, settings = ?, version = version + 1, updated_at = datetime('now') WHERE id = ? AND owner_id = ? RETURNING id, slug, name, settings, updated_at, version",
      [data.name ?? cur.name, JSON.stringify(settings), data.id, me.id],
    );
    const p = toProject(row!);
    await publish(me.id, "project", "upsert", p.id, p.version, p);
    return p;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: v.id }).parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const rows = await d1<{ version: number }>("DELETE FROM projects WHERE id = ? AND owner_id = ? RETURNING version", [data.id, me.id]);
    if (!rows[0]) throw new Error("Project not found");
    await publish(me.id, "project", "delete", data.id, rows[0].version + 1, null);
    return { ok: true };
  });

// Messages
export const listMessages = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ projectId: v.id }).parse(d))
  .handler(async ({ data }): Promise<Message[]> => {
    const { me, d1 } = await ctx();
    const { assertOwnsProject } = await import("@security/authorize.server");
    await assertOwnsProject(me.id, data.projectId);
    const rows = await d1<{ id: string; role: Message["role"]; content: string; created_at: string }>(
      "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid LIMIT 500",
      [data.projectId],
    );
    return rows.map((r) => ({ id: r.id, projectId: data.projectId, role: r.role, content: r.content, createdAt: r.created_at, version: 1 }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => v.messageCreate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const { assertOwnsProject } = await import("@security/authorize.server");
    await assertOwnsProject(me.id, data.projectId);
    await d1("INSERT OR IGNORE INTO conversations (id, project_id) VALUES (?, ?)", [data.projectId, data.projectId]);
    const [row] = await d1<{ id: string; created_at: string }>(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?) RETURNING id, created_at",
      [crypto.randomUUID(), data.projectId, data.content],
    );
    const m: Message = { id: row!.id, projectId: data.projectId, role: "user", content: data.content, createdAt: row!.created_at, version: 1 };
    await publish(me.id, "message", "upsert", m.id, 1, m);
    return m;
  });

// Tasks
export const createTask = createServerFn({ method: "POST" })
  .inputValidator((d) => v.taskCreate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const { assertOwnsProject } = await import("@security/authorize.server");
    await assertOwnsProject(me.id, data.projectId);
    const [row] = await d1<TRow>(
      "INSERT INTO ai_tasks (id, project_id, title, description, status) VALUES (?, ?, ?, ?, 'draft') RETURNING id, project_id, title, description, status, version",
      [crypto.randomUUID(), data.projectId, data.title, data.description],
    );
    const t = toTask(row!);
    await publish(me.id, "task", "upsert", t.id, t.version, t);
    return t;
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((d) => v.taskUpdate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const { assertOwnsTask } = await import("@security/authorize.server");
    await assertOwnsTask(me.id, data.id);
    const [row] = await d1<TRow>(
      `UPDATE ai_tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status),
       version = version + 1, updated_at = datetime('now') WHERE id = ? RETURNING id, project_id, title, description, status, version`,
      [data.title ?? null, data.description ?? null, data.status ?? null, data.id],
    );
    const t = toTask(row!);
    await publish(me.id, "task", "upsert", t.id, t.version, t);
    return t;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: v.id }).parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const { assertOwnsTask } = await import("@security/authorize.server");
    await assertOwnsTask(me.id, data.id);
    const [row] = await d1<{ version: number }>("DELETE FROM ai_tasks WHERE id = ? RETURNING version", [data.id]);
    await publish(me.id, "task", "delete", data.id, (row?.version ?? 0) + 1, null);
    return { ok: true };
  });

// Profile
export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => v.profileUpdate.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const [row] = await d1<{ display_name: string | null; avatar_url: string | null; version: number }>(
      `UPDATE profiles SET display_name = COALESCE(?, display_name), avatar_url = CASE WHEN ? THEN ? ELSE avatar_url END,
       version = version + 1, updated_at = datetime('now') WHERE user_id = ? RETURNING display_name, avatar_url, version`,
      [data.displayName ?? null, data.avatarUrl !== undefined ? 1 : 0, data.avatarUrl ?? null, me.id],
    );
    const p: Profile = { email: me.email, displayName: row!.display_name, avatarUrl: row!.avatar_url, version: row!.version };
    await publish(me.id, "profile", "upsert", me.id, p.version, p);
    return p;
  });

// Generic per-user UI/app state (tool state, imports, integrations…)
export const setState = createServerFn({ method: "POST" })
  .inputValidator((d) => v.stateSet.parse(d))
  .handler(async ({ data }) => {
    const { me, d1, publish } = await ctx();
    const value = JSON.stringify(data.value ?? null);
    if (value.length > 20000) throw new Error("Value too large");
    const [row] = await d1<{ version: number }>(
      `INSERT INTO user_state (user_id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, version = user_state.version + 1, updated_at = datetime('now')
       RETURNING version`,
      [me.id, data.key, value],
    );
    const s: StateEntry = { key: data.key, value: JSON.parse(value) as Json, version: row!.version };
    await publish(me.id, "state", "upsert", data.key, s.version, s);
    return s;
  });
