import { AuthShell } from "@/components/AuthShell";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AuthHeader, MOCK_USER, SocialButtons } from "@/components/AuthParts";
import { Button } from "@/components/ui/button";


const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const r = schema.safeParse(form);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Check your details");
    setBusy(true);
    setTimeout(() => {
      if (form.email.trim() !== MOCK_USER.email || form.password !== MOCK_USER.password) {
        setBusy(false);
        return setError("Incorrect email or password");
      }
      navigate({ to: "/dashboard" });
    }, 700);
  };

  return (
    <AuthShell>
        <AuthHeader title="Log in" sub="Welcome back to Speed." />
        <SocialButtons disabled={busy} onPick={() => { setBusy(true); setTimeout(() => navigate({ to: "/dashboard" }), 600); }} />
        <form onSubmit={submit} className="auth-form" noValidate>
          <label>Email<input className="sp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" maxLength={255} /></label>
          <label>
            <span className="auth-row">Password<Link to="/auth/forgot-password">Forgot?</Link></span>
            <input className="sp-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" maxLength={72} />
          </label>
          {error && <p className="sp-err" role="alert">{error}</p>}
          <Button type="submit" className="auth-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
        </form>
        <p className="auth-hint">Demo: {MOCK_USER.email} / {MOCK_USER.password}</p>
        <p className="auth-foot">New to Speed? <Link to="/auth/signup">Create account</Link></p>
      </AuthShell>
  );
}
