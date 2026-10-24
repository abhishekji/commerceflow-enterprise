import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AUTH_MESSAGES, ROUTES, SUPPORTED_CURRENCIES } from "../../common/constants";
import { AuthCard } from "../../components/AuthCard";
import { useAuth } from "../../context/AuthContext";
import { slugify } from "../../utils/text";

const TIME_ZONES: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

const initialForm = () => ({
  tenantName: "",
  tenantSlug: "",
  defaultCurrency: "USD",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});

type FormField = keyof ReturnType<typeof initialForm>;

export function RegisterPage() {
  const { register, authError, clearAuthError } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field: FormField) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  function updateName(event: ChangeEvent<HTMLInputElement>) {
    const tenantName = event.target.value;
    setForm((current) => ({
      ...current,
      tenantName,
      tenantSlug: slugEdited ? current.tenantSlug : slugify(tenantName),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (form.password !== form.confirmPassword) {
      setLocalError(AUTH_MESSAGES.PASSWORD_MISMATCH);
      return;
    }
    const { confirmPassword: _confirm, ...payload } = form;
    setSubmitting(true);
    await register(payload);
    setSubmitting(false);
  }

  return (
    <AuthCard
      wide
      title="CREATE YOUR ORGANIZATION"
      subtitle="Set up your organization and administrator account."
      error={localError || authError}
      onSubmit={submit}
    >
      <label>
        Organization name
        <input autoComplete="organization" value={form.tenantName} onChange={updateName} maxLength={120} required />
      </label>
      <label>
        Organization slug
        <input
          value={form.tenantSlug}
          onChange={(event) => { setSlugEdited(true); update("tenantSlug")(event); }}
          pattern="[a-z0-9\-]{2,80}"
          title="2–80 lowercase letters, numbers, or hyphens"
          required
        />
      </label>
      <div className="form-row">
        <label>
          Currency
          <select value={form.defaultCurrency} onChange={update("defaultCurrency")}>
            {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label>
          Time zone
          <select value={form.timeZone} onChange={update("timeZone")}>
            {!TIME_ZONES.includes(form.timeZone) && <option value={form.timeZone}>{form.timeZone}</option>}
            {TIME_ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          First name
          <input autoComplete="given-name" value={form.firstName} onChange={update("firstName")} maxLength={80} required />
        </label>
        <label>
          Last name
          <input autoComplete="family-name" value={form.lastName} onChange={update("lastName")} maxLength={80} required />
        </label>
      </div>
      <label>
        Email
        <input type="email" autoComplete="username" value={form.email} onChange={update("email")} required />
      </label>
      <label>
        Password (at least 12 characters)
        <input type="password" autoComplete="new-password" value={form.password} onChange={update("password")} minLength={12} maxLength={200} required />
      </label>
      <label>
        Confirm password
        <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update("confirmPassword")} minLength={12} required />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</button>
      <Link className="link-button" to={ROUTES.LOGIN} onClick={clearAuthError}>Already registered? Sign in</Link>
    </AuthCard>
  );
}
