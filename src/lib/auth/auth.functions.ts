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
    const { issueVerifyCode } = await import("@/lib/email/send.server");
    await issueVerifyCode(id, data.email);
    return { ok: true as const };
  });

async function requestMeta() {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = (getRequestHeader("user-agent") ?? "unknown").slice(0, 160);
  return { ip, agent };
}

export const signIn = createServerFn({ method: "POST" })
  .validator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { d1 } = await import("@/lib/d1/d1.server");
    const { verifyPassword } = await import("@security/session.server");
    const rows = await d1<{ id: string; email: string; password_hash: string | null; email_verified: number }>("SELECT id, email, password_hash, email_verified FROM users WHERE email = ?", [data.email]);
    const u = rows[0];
    if (!u?.password_hash || !(await verifyPassword(data.password, u.password_hash))) return { ok: false as const, error: "Incorrect email or password" };
    await setSession(u.id);
    if (u.email_verified) {
      const { sendEmail, nowText } = await import("@/lib/email/send.server");
      await sendEmail("loginAlert", u.email, { when: nowText(), ...(await requestMeta()) }, { userId: u.id });
    }
    return { ok: true as const, verified: !!u.email_verified };
  });

async function sessionUser() {
  const { currentUser } = await import("@security/authorize.server");
  return currentUser();
}

export const verifyEmail = createServerFn({ method: "POST" })
  .validator((d) => z.object({ code: z.string().regex(/^\d{8}$/, "Enter the 8-digit code") }).parse(d))
  .handler(async ({ data }) => {
    const me = await sessionUser();
    if (!me) return { ok: false as const, error: "Please log in again" };
    if (me.email_verified) return { ok: true as const };
    const { d1 } = await import("@/lib/d1/d1.server");
    const { hashCode } = await import("@/lib/email/send.server");
    const now = Math.floor(Date.now() / 1000);
    const [row] = await d1<{ id: string; code_hash: string; attempts: number; expires_at: number }>(
      "SELECT id, code_hash, attempts, expires_at FROM email_codes WHERE user_id = ? AND purpose = 'verify' ORDER BY created_at DESC LIMIT 1", [me.id]);
    if (!row || row.expires_at < now) return { ok: false as const, error: "This code has expired. Send a new one." };
    if (row.attempts >= 5) return { ok: false as const, error: "Too many attempts. Send a new code." };
    if (row.code_hash !== (await hashCode(data.code))) {
      await d1("UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
      return { ok: false as const, error: "That code isn't right" };
    }
    await d1("UPDATE users SET email_verified = 1 WHERE id = ?", [me.id]);
    await d1("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'verify'", [me.id]);
    return { ok: true as const };
  });

export const resendVerifyCode = createServerFn({ method: "POST" }).handler(async () => {
  const me = await sessionUser();
  if (!me) return { ok: false as const, error: "Please log in again" };
  if (me.email_verified) return { ok: true as const };
  const { issueVerifyCode } = await import("@/lib/email/send.server");
  return issueVerifyCode(me.id, me.email);
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { d1 } = await import("@/lib/d1/d1.server");
    const { hashCode, sendEmail } = await import("@/lib/email/send.server");
    const { randomId } = await import("@security/session.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const [u] = await d1<{ id: string; email: string }>("SELECT id, email FROM users WHERE email = ?", [data.email]);
    const now = Math.floor(Date.now() / 1000);
    if (u) {
      const recent = await d1<{ n: number }>("SELECT COUNT(*) AS n FROM email_codes WHERE user_id = ? AND purpose = 'reset' AND created_at > ?", [u.id, now - 60]);
      if (!(recent[0]?.n)) {
        const token = randomId(32);
        await d1("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'", [u.id]);
        await d1("INSERT INTO email_codes (id, user_id, purpose, code_hash, expires_at, created_at) VALUES (?, ?, 'reset', ?, ?, ?)",
          [crypto.randomUUID(), u.id, await hashCode(token), now + 30 * 60, now]);
        const url = `${getRequestUrl().origin}/auth/reset-password?token=${token}`;
        await sendEmail("passwordReset", u.email, { url }, { userId: u.id });
      }
    }
    return { ok: true as const }; // same response whether or not the account exists
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { d1 } = await import("@/lib/d1/d1.server");
    const { hashCode, sendEmail, nowText } = await import("@/lib/email/send.server");
    const { hashPassword } = await import("@security/session.server");
    const now = Math.floor(Date.now() / 1000);
    const [row] = await d1<{ user_id: string; email: string }>(
      "SELECT c.user_id, u.email FROM email_codes c JOIN users u ON u.id = c.user_id WHERE c.purpose = 'reset' AND c.code_hash = ? AND c.expires_at > ?",
      [await hashCode(data.token), now]);
    if (!row) return { ok: false as const, error: "This reset link is invalid or has expired" };
    await d1("UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?", [await hashPassword(data.password), row.user_id]);
    await d1("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'", [row.user_id]);
    await d1("DELETE FROM sessions WHERE user_id = ?", [row.user_id]);
    await sendEmail("accountSecurity", row.email, { change: "Your Speed password was changed and all devices were signed out.", when: nowText() }, { userId: row.user_id });
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
