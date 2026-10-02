import { envStr } from "./context";
export type Provider = "google" | "github";

// The OAuth callback always lives on the API Worker itself, independent of the frontend host.
export const callbackUrl = (request: Request, p: Provider) => `${new URL(request.url).origin}/auth/callback/${p}`;

export function providerConfig(p: Provider) {
  const id = envStr(p === "google" ? "GOOGLE_CLIENT_ID" : "GITHUB_CLIENT_ID");
  const secret = envStr(p === "google" ? "GOOGLE_CLIENT_SECRET" : "GITHUB_CLIENT_SECRET");
  return id && secret ? { id, secret } : null;
}

export function authorizeUrl(p: Provider, clientId: string, redirect: string, state: string) {
  if (p === "google") {
    const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, scope: "read:user user:email", state });
  return `https://github.com/login/oauth/authorize?${q}`;
}

export async function fetchIdentity(p: Provider, code: string, redirect: string, cfg: { id: string; secret: string }) {
  if (p === "google") {
    const t = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: cfg.id, client_secret: cfg.secret, redirect_uri: redirect, grant_type: "authorization_code" }),
    }).then((r) => r.json() as Promise<{ access_token?: string }>);
    if (!t.access_token) throw new Error("Google sign-in failed");
    const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } })
      .then((r) => r.json() as Promise<{ sub: string; email: string; email_verified: boolean; name?: string; picture?: string }>);
    if (!u.email || !u.email_verified) throw new Error("Google account email is not verified");
    return { id: u.sub, email: u.email.toLowerCase(), name: u.name, avatar: u.picture };
  }
  const t = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: cfg.id, client_secret: cfg.secret, code, redirect_uri: redirect }),
  }).then((r) => r.json() as Promise<{ access_token?: string }>);
  if (!t.access_token) throw new Error("GitHub sign-in failed");
  const h = { Authorization: `Bearer ${t.access_token}`, "User-Agent": "speed-agent", Accept: "application/vnd.github+json" };
  const u = await fetch("https://api.github.com/user", { headers: h }).then((r) => r.json() as Promise<{ id: number; name?: string; login: string; avatar_url?: string }>);
  const emails = await fetch("https://api.github.com/user/emails", { headers: h }).then((r) => r.json() as Promise<{ email: string; primary: boolean; verified: boolean }[]>);
  const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  if (!primary) throw new Error("GitHub account has no verified email");
  return { id: String(u.id), email: primary.email.toLowerCase(), name: u.name ?? u.login, avatar: u.avatar_url };
}
