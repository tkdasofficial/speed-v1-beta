import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMe } from "@/lib/auth/auth.functions";
import { bootShell } from "@shell/index";

// Authentication-first gate: the session is validated server-side (cookie) before
// any protected route code, loader or data runs. Unauthenticated → /auth/login.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => getMe(), staleTime: 60_000 });
    if (!me) throw redirect({ to: "/auth/login", search: { redirect: location.href } as never });
    return { me };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const { me, queryClient } = Route.useRouteContext();
  useEffect(() => { void bootShell(queryClient, me.id); }, [queryClient, me.id]);
  return <Outlet />;
}
