// Shared request schemas. Server functions always parse input with these.
import { z } from "zod";

export const id = z.string().min(1).max(64);
export const projectCreate = z.object({ name: z.string().trim().min(1).max(80) });
export const projectUpdate = z.object({
  id,
  name: z.string().trim().min(1).max(80).optional(),
  settings: z.record(z.string(), z.union([z.string().max(200), z.boolean(), z.number()])).optional(),
});
export const messageCreate = z.object({ projectId: id, content: z.string().trim().min(1).max(10000) });
export const taskCreate = z.object({ projectId: id, title: z.string().trim().min(1).max(200), description: z.string().max(2000).default("") });
export const taskUpdate = z.object({
  id,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "ready", "active", "done"]).optional(),
});
export const profileUpdate = z.object({ displayName: z.string().trim().min(1).max(100).optional(), avatarUrl: z.string().url().max(500).nullable().optional() });
export const stateSet = z.object({ key: z.string().regex(/^[a-z0-9:_-]{1,80}$/), value: z.unknown() });
export const since = z.object({ seq: z.number().int().min(0) });
