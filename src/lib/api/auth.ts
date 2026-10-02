// Auth client — calls the Speed API Worker. Types come from the backend handlers (type-only import).
import type * as A from "../../../cloudflare/functions/api/auth";
import { endpoint, setToken } from "./index";

const withToken = <F extends (arg?: { data?: unknown }) => Promise<unknown>>(f: F) =>
  (async (arg?: { data?: unknown }) => {
    const r = (await f(arg)) as { token?: string };
    if (r && typeof r === "object" && r.token) setToken(r.token);
    return r;
  }) as F;

export const signUp = withToken(endpoint<typeof A.signUp>("signUp"));
export const signIn = withToken(endpoint<typeof A.signIn>("signIn"));
export const verifyEmail = endpoint<typeof A.verifyEmail>("verifyEmail");
export const resendVerifyCode = endpoint<typeof A.resendVerifyCode>("resendVerifyCode");
export const requestPasswordReset = endpoint<typeof A.requestPasswordReset>("requestPasswordReset");
export const resetPassword = endpoint<typeof A.resetPassword>("resetPassword");
export const getMe = () => endpoint<typeof A.getMe>("getMe")().catch(() => null);
export const saveProfile = endpoint<typeof A.saveProfile>("saveProfile");
export const signOut = async () => {
  try { return await endpoint<typeof A.signOut>("signOut")(); } finally { setToken(null); }
};
export const getGithubConnection = endpoint<typeof A.getGithubConnection>("getGithubConnection");
