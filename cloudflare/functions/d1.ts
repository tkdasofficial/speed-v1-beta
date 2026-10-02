// Cloudflare D1 access through the Worker's native `DB` binding. Backend-only.
import { ctx } from "./context";

export async function d1<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await ctx().env.DB.prepare(sql).bind(...params.map((p) => (p === undefined ? null : p))).all<T>();
  return r.results ?? [];
}
