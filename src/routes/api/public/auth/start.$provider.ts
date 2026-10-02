import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/start/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { providerConfig, authorizeUrl, callbackUrl, appOrigin } = await import("@/lib/auth/oauth.server");
        const { randomId } = await import("@security/session.server");
        const p = params.provider;
        if (p !== "google" && p !== "github") return new Response("Unknown provider", { status: 404 });
        const cfg = providerConfig(p);
        if (!cfg) return Response.redirect(`${appOrigin(request)}/auth/login?error=${p}_not_configured`, 302);
        const state = randomId(16);
        const secure = new URL(request.url).protocol === "https:";
        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizeUrl(p, cfg.id, callbackUrl(request, p), state),
            "Set-Cookie": `speed_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`,
          },
        });
      },
    },
  },
});
