// Speed API — Cloudflare Worker entry. All backend functionality lives here:
//   POST /rpc/:name             JSON RPC for auth + live data (Authorization: Bearer <session>)
//   GET  /auth/start/:provider  OAuth start (?return=<allowed frontend origin>)
//   GET  /oauth/:provider/callback  (google, github, gitlab, bitbucket)
//   POST /stripe/webhook        signature-verified billing events
//   GET  /health
import { ZodError } from "zod";
import { als, isAllowedOrigin, type Env } from "./context";
import { AuthError } from "@security/authorize.server";
import * as auth from "./api/auth";
import * as sync from "./api/sync";

const handlers: Record<string, (data: unknown) => Promise<unknown>> = { ...auth, ...sync } as never;

function cors(origin: string | null, env: Env): Record<string, string> {
  if (!isAllowedOrigin(origin, env)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

const b64u = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function oauthStart(req: Request, env: Env, p: string) {
  const { providerConfig, authorizeUrl, callbackUrl, isProvider } = await import("./oauth");
  const { randomId } = await import("@security/session.server");
  const ret = new URL(req.url).searchParams.get("return");
  if (!isAllowedOrigin(ret, env)) return new Response("Origin not allowed", { status: 403 });
  if (!isProvider(p)) return Response.redirect(`${ret}/auth/login?error=unknown_provider`, 302);
  const cfg = providerConfig(p);
  if (!cfg) return Response.redirect(`${ret}/auth/login?error=${p}_not_configured`, 302);
  const state = randomId(16);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(p, cfg.id, callbackUrl(req, p), state),
      "Set-Cookie": `speed_oauth=${state}.${b64u(ret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function oauthCallback(req: Request, env: Env, p: string) {
  const raw = /(?:^|;\s*)speed_oauth=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1] ?? "";
  const [cookieState, encOrigin] = raw.split(".");
  let origin: string | null = null;
  try { origin = encOrigin ? unb64u(encOrigin) : null; } catch { origin = null; }
  if (!isAllowedOrigin(origin, env)) return new Response("Sign-in expired, please try again", { status: 400 });
  const clear = "speed_oauth=; Path=/; Max-Age=0";
  const fail = (msg: string) => new Response(null, { status: 302, headers: { Location: `${origin}/auth/login?error=${encodeURIComponent(msg)}`, "Set-Cookie": clear } });
  const { providerConfig, fetchIdentity, callbackUrl, isProvider } = await import("./oauth");
  if (!isProvider(p)) return fail("Unknown provider");
  const { upsertOAuthUser, createSession, userFromToken } = await import("@security/session.server");
  const cfg = providerConfig(p);
  if (!cfg) return fail(`${p} sign-in is not configured`);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== cookieState) return fail("Sign-in expired, please try again");
  try {
    const who = await fetchIdentity(p, code, callbackUrl(req, p), cfg);
    const userId = await upsertOAuthUser(p, who.id, who.email, who.name, who.avatar);
    const token = await createSession(userId);
    const me = await userFromToken(token);
    const next = me?.onboarded ? "/dashboard" : "/getting-started";
    return new Response(null, { status: 302, headers: { Location: `${origin}/auth/oauth#token=${token}&next=${encodeURIComponent(next)}`, "Set-Cookie": clear } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Sign-in failed");
  }
}

async function stripeWebhook(req: Request, env: Env) {
  const secret = typeof env["STRIPE_WEBHOOK_SECRET"] === "string" ? env["STRIPE_WEBHOOK_SECRET"] : "";
  if (!secret) return new Response("Billing is not configured", { status: 503 });
  const body = await req.text();
  const { verifyStripeSignature, applySubscription } = await import("@security/stripe.server");
  if (!(await verifyStripeSignature(body, req.headers.get("stripe-signature"), secret))) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(body) as { id: string; type: string; data: { object: Record<string, unknown> } };
  const { notifyBilling } = await import("./email/billing.server");
  if (event.type.startsWith("customer.subscription.")) {
    const userId = await applySubscription(event.data.object as Parameters<typeof applySubscription>[0]);
    if (userId) await notifyBilling(event, userId);
  } else if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    await notifyBilling(event, null);
  }
  return new Response("ok");
}

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const h = cors(origin, env);
  if (req.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(origin, env) ? 204 : 403, headers: h });

  const rpc = /^\/rpc\/([A-Za-z]+)$/.exec(url.pathname);
  if (rpc && req.method === "POST") {
    // Browser calls must come from an allowed frontend origin.
    if (origin && !isAllowedOrigin(origin, env)) return json({ error: "Origin not allowed" }, 403, h);
    const fn = handlers[rpc[1]!];
    if (!fn) return json({ error: "Not found" }, 404, h);
    let body: { data?: unknown } = {};
    try { body = (await req.json()) as { data?: unknown }; } catch { body = {}; }
    try {
      return json({ result: (await fn(body.data)) ?? null }, 200, h);
    } catch (e) {
      if (e instanceof AuthError) return json({ error: e.message }, e.status, h);
      if (e instanceof ZodError) return json({ error: e.issues[0]?.message ?? "Invalid input" }, 400, h);
      console.error(`[rpc] ${rpc[1]} failed:`, (e as Error).message);
      return json({ error: e instanceof Error ? e.message : "Server error" }, 500, h);
    }
  }
  const start = /^\/auth\/start\/(\w+)$/.exec(url.pathname);
  if (start && req.method === "GET") return oauthStart(req, env, start[1]!);
  const cb = /^\/oauth\/(\w+)\/callback\/?$/.exec(url.pathname) ?? /^\/auth\/callback\/(\w+)$/.exec(url.pathname);
  if (cb && req.method === "GET") return oauthCallback(req, env, cb[1]!);
  if (url.pathname === "/stripe/webhook" && req.method === "POST") return stripeWebhook(req, env);
  if (url.pathname === "/health") return json({ ok: true }, 200, h);
  return json({ error: "Not found" }, 404, h);
}

// Cloudflare Secrets Store bindings expose `get()`; resolve them once per request
// so the rest of the code reads plain strings via envStr().
async function resolveSecrets(env: Env): Promise<Env> {
  const out: Env = { ...env };
  await Promise.all(Object.entries(env).map(async ([k, v]) => {
    if (v && typeof v === "object" && typeof (v as { get?: unknown }).get === "function" && k !== "DB") {
      try { out[k] = await (v as { get(): Promise<string> }).get(); } catch { out[k] = undefined; }
    }
  }));
  return out;
}

export default {
  async fetch(req: Request, env: Env) {
    const e = await resolveSecrets(env);
    return als.run({ req, env: e }, () => route(req, e));
  },
};
