<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Speed Agent UI-only until backend workflows are explicitly requested; this preserves the PRD's current implementation phase.
- Use a mobile-first, Replit-inspired workspace shell with the locked palette only (#000, #FFF, #1A1A1A, blue #1D4ED8, red #FF3B3B); this is the brief's non-negotiable visual system.
- Use Manrope throughout, with 400 for body copy, 500 for controls, 600 for headings, and 700–800 for labels and emphasis; this preserves hierarchy with one font family.
- Keep workspace-wide navigation and fixed controls in reusable global components, while page content remains view-specific; this prevents header duplication and overlap regressions.
- AppDrawer owns both the persistent desktop sidebar and mobile overlay, with styles isolated in its module stylesheet; this keeps navigation content, behavior, and quality consistent.
- Projects open at /project/$projectId (slug of project name); dashboard contains no workspace UI; /workspace redirects to a default project.
- Workspace navigation uses a bottom Tools / Preview / Tasks bar, while Settings opens from the project menu; this preserves immediate access to the Agent conversation without top tabs.
- Preview controls reuse the workspace bottom bar and keep preview state in the workspace route; this avoids a duplicate header and preserves chat navigation.

- Store the uploaded dark and light Speed logo variants as CDN pointers and render them through the shared BrandLogo component; this keeps brand art consistent while adapting to surfaces.
- Render logo artwork through the square AppIcon component (including BrandLogo) and theme-select its variant; this prevents drawer compression and keeps project icons consistent.
- Keep account and policy screens UI-only until actual identity and legal copy are supplied; this avoids implying mock sign-out or placeholder legal text is real.
- Backend data lives in Cloudflare D1 (schema in db/schema.sql) reached only from server code via src/lib/d1/d1.server.ts; keeps credentials off the client.
- Auth is custom: PBKDF2 passwords, hashed session tokens in an HttpOnly cookie, Google/GitHub OAuth via /api/public/auth/start|callback/$provider; no third-party auth service is used.
- All page top bars render the single global Header component (left / title / right slots, workspace-header sizing); never add page-specific headers, to keep size and behavior identical everywhere.
- Folder-per-module with index files: page bodies in src/pages/<Name>/index.tsx (page CSS beside it), components in src/components/<Name>/index.tsx, helpers in src/lib/<name>/index.ts; src/routes files stay thin (createFileRoute + head + imported page) because TanStack routing requires them there. shadcn primitives stay flat in src/components/ui.
- Each page and reusable shell imports its own `src/style/<Name>/index.css`; this keeps style ownership explicit and prevents unrelated page rules from conflicting.
- Landing sections use scoped `.lp-` classes and auth screens render inside the shared AuthShell with scoped `.au-` classes; this preserves visual isolation.
- Dashboard and PageShell share only PageShell-owned primitives; PageShell relies on the global header title and never repeats page names inside the scroll area.
- Root layers: `security/` (server-only TS: sessions, authorization, entitlements, Stripe verification, validation), `real-time/` (delta events, publish-after-write, client sync, relay Worker), `shell/` (boot orchestration, Service Worker, IndexedDB); keeps concerns separated.
- Every live-data write goes validate → authorize → D1 write (bump `version`) → `publish()` to change_log + relay; clients never change shared state locally, so the server stays authoritative.
- Real-time relay is a Cloudflare Worker + per-user Durable Object (`real-time/worker`, deploy with `bun ./real-time/worker/deploy.ts`); clients join with short-lived HMAC tokens and recover gaps via change_log, so no polling is needed.
- Protected pages live under `src/routes/_authenticated/`, whose server-side cookie check runs before any protected code or data; the App Shell boots only after it passes.
- Service Worker only caches build assets and page HTML, never server functions or API routes, and registers only in production builds.
