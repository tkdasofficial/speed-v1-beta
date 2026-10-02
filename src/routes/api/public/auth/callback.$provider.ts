import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/callback/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { providerConfig, fetchIdentity, callbackUrl, appOrigin } = await import("@/lib/auth/oauth.server");
        const { upsertOAuthUser, createSession, sessionCookie, userFromToken } = await import("@/lib/auth/auth.server");
        const origin = appOrigin(request);
        const fail = (msg: string) => Response.redirect(`${origin}/auth/login?error=${encodeURIComponent(msg)}`, 302);
        const p = params.provider;
        if (p !== "google" && p !== "github") return fail("Unknown provider");
        const cfg = providerConfig(p);
        if (!cfg) return fail(`${p} sign-in is not configured`);
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookieState = /(?:^|;\s*)speed_oauth_state=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1];
        if (!code || !state || state !== cookieState) return fail("Sign-in expired, please try again");
        try {
          const who = await fetchIdentity(p, code, callbackUrl(request, p), cfg);
          const userId = await upsertOAuthUser(p, who.id, who.email, who.name, who.avatar);
          const token = await createSession(userId);
          const me = await userFromToken(token);
          const headers = new Headers({ Location: `${origin}${me?.onboarded ? "/dashboard" : "/getting-started"}` });
          headers.append("Set-Cookie", sessionCookie(token, url.protocol === "https:"));
          headers.append("Set-Cookie", "speed_oauth_state=; Path=/; Max-Age=0");
          return new Response(null, { status: 302, headers });
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Sign-in failed");
        }
      },
    },
  },
});
