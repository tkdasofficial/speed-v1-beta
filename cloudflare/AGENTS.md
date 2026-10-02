# Cloudflare backend rules

- Real-time relay is a Cloudflare Worker + per-user Durable Object (`cloudflare/real-time/worker`, deploy with `bun cloudflare/real-time/worker/deploy.ts`); clients join with short-lived HMAC tokens and recover gaps via change_log, so no polling is needed.
- D1 is accessed only through the Worker's native `DB` binding (`cloudflare/functions/d1.ts`); allowed frontend origins come from the `ALLOWED_ORIGINS` Worker variable, never from code.
- All email goes through `cloudflare/functions/email/send.server.ts` (Gmail SMTP); only the allowed types in templates.server.ts may be sent, never project-activity emails.
- Worker secrets come only from the account Secrets Store (`cloudflare/secrets-store.ts`, bound as `secrets_store_secret`, resolved once per request); never plain Worker secrets or code.
