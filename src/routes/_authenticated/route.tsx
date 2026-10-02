import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMe } from "@/lib/api/auth";
import { bootShell } from "@shell/index";

// Authentication-first gate: the session is validated server-side (cookie) before
// any protected route code, loader or data runs. Unauthenticated → /auth/login.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    // Only a positive result is cached client-side; the server re-validates every protected call anyway.
    const cached = context.queryClient.getQueryData<Awaited<ReturnType<typeof getMe>>>(["me"]);
    const me = cached ?? (await getMe());
    if (me) context.queryClient.setQueryData(["me"], me);
    if (!me) throw redirect({ to: "/auth/login", search: { redirect: location.href } as never });
    if (!me.email_verified) {
      context.queryClient.removeQueries({ queryKey: ["me"] });
      throw redirect({ to: "/auth/verify-email" });
    }
    return { me };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const { me, queryClient } = Route.useRouteContext();
  useEffect(() => { void bootShell(queryClient, me.id); }, [queryClient, me.id]);
  return <Outlet />;
}
