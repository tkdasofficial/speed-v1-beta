import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(8).max(72) });

async function setSession(userId: string) {
  const { createSession, SESSION_COOKIE, SESSION_TTL } = await import("@security/session.server");
  const { setCookie, getRequestProtocol } = await import("@tanstack/react-start/server");
  const token = await createSession(userId);
  setCookie(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: SESSION_TTL, secure: getRequestProtocol() === "https" });
}

export const signUp = createServerFn({ method: "POST" })
  .validator((d) => creds.parse(d))
  .handler(async ({ data }) => {
    const { d1 } = await import("@/lib/d1/d1.server");
    const { hashPassword } = await import("@security/session.server");
    const exists = await d1("SELECT id FROM users WHERE email = ?", [data.email]);
    if (exists.length) return { ok: false as const, error: "An account with this email already exists" };
    const id = crypto.randomUUID();
    await d1("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [id, data.email, await hashPassword(data.password)]);
    await d1("INSERT INTO profiles (user_id) VALUES (?)", [id]);
    await setSession(id);
    return { ok: true as const };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { d1 } = await import("@/lib/d1/d1.server");
    const { verifyPassword } = await import("@security/session.server");
    const rows = await d1<{ id: string; password_hash: string | null }>("SELECT id, password_hash FROM users WHERE email = ?", [data.email]);
    const u = rows[0];
    if (!u?.password_hash || !(await verifyPassword(data.password, u.password_hash))) return { ok: false as const, error: "Incorrect email or password" };
    await setSession(u.id);
    return { ok: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const { deleteSession, SESSION_COOKIE } = await import("@security/session.server");
  const t = getCookie(SESSION_COOKIE);
  if (t) await deleteSession(t);
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUser } = await import("@security/authorize.server");
  return currentUser();
});

export const saveProfile = createServerFn({ method: "POST" })
  .validator((d) => z.object({ fullName: z.string().trim().min(1).max(100), role: z.string().max(40), teamType: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const { userFromToken, SESSION_COOKIE } = await import("@security/session.server");
    const { d1 } = await import("@/lib/d1/d1.server");
    const me = await userFromToken(getCookie(SESSION_COOKIE));
    if (!me) return { ok: false as const, error: "Please log in again" };
    await d1(
      `INSERT INTO profiles (user_id, display_name, role, company, onboarded, updated_at) VALUES (?, ?, ?, ?, 1, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, role=excluded.role, company=excluded.company, onboarded=1, updated_at=datetime('now')`,
      [me.id, data.fullName, data.role, data.teamType],
    );
    const [row] = await d1<{ display_name: string | null; avatar_url: string | null; version: number }>(
      "UPDATE profiles SET version = version + 1 WHERE user_id = ? RETURNING display_name, avatar_url, version", [me.id]);
    const { publish } = await import("@realtime/publish.server");
    if (row) await publish(me.id, "profile", "upsert", me.id, row.version, { email: me.email, displayName: row.display_name, avatarUrl: row.avatar_url, version: row.version });
    return { ok: true as const };
  });
