import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../common/constants";
import { AuthCard } from "../../components/AuthCard";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login, authError, clearAuthError } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await login({ tenantSlug, email, password });
    setSubmitting(false);
  }

  return (
    <AuthCard title="BIGARENA FULFILLMENT" subtitle="Sign in to view your fulfillment dashboard." error={authError} onSubmit={submit}>
      <label>
        Organization slug
        <input autoComplete="organization" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} required />
      </label>
      <label>
        Email
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
      <Link className="link-button" to={ROUTES.REGISTER} onClick={clearAuthError}>New organization? Create an account</Link>
    </AuthCard>
  );
}
