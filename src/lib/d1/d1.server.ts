// Cloudflare D1 access over the REST API. Server-only.
type D1Result<T> = { results: T[]; success: boolean; meta?: unknown };

export async function d1<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const account = process.env["CLOUDFLARE_ACCOUNT_ID"];
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const db = process.env["CLOUDFLARE_D1_DATABASE_ID"];
  if (!account || !token || !db) throw new Error("Database is not configured");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const json = (await res.json()) as { success: boolean; errors?: { message: string }[]; result?: D1Result<T>[] };
  if (!json.success) throw new Error(json.errors?.[0]?.message ?? "Database error");
  return json.result?.[0]?.results ?? [];
}
