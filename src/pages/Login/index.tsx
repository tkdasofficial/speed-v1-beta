import { AuthShell } from "@/components/AuthShell";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthHeader, SocialButtons, startOAuth } from "@/components/AuthParts";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/auth.functions";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

export function LoginPage() {
  const navigate = useNavigate();
  const doSignIn = useServerFn(signIn);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e) setError(e.replace(/_/g, " "));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const r = schema.safeParse(form);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Check your details");
    setBusy(true);
    try {
      const res = await doSignIn({ data: r.data });
      if (!res.ok) { setBusy(false); return setError(res.error); }
      navigate({ to: res.verified ? "/dashboard" : "/auth/verify-email" });
    } catch {
      setBusy(false);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <AuthShell>
        <AuthHeader title="Log in" sub="Welcome back to Speed." />
        <SocialButtons disabled={busy} onPick={(p) => { setBusy(true); startOAuth(p); }} />
        <form onSubmit={submit} className="auth-form" noValidate>
          <label>Email<input className="sp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" maxLength={255} /></label>
          <label>
            <span className="auth-row">Password<Link to="/auth/forgot-password">Forgot?</Link></span>
            <input className="sp-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" maxLength={72} />
          </label>
          {error && <p className="sp-err" role="alert">{error}</p>}
          <Button type="submit" className="auth-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
        </form>
        <p className="auth-foot">New to Speed? <Link to="/auth/signup">Create account</Link></p>
      </AuthShell>
  );
}
