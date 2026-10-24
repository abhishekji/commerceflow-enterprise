import type { FormEvent, ReactNode } from "react";
import "./AuthCard.scss";

interface AuthCardProps {
  title: string;
  subtitle: string;
  error?: string;
  wide?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, error, wide, onSubmit, children }: AuthCardProps) {
  return (
    <main className="login-screen">
      <form className={`login-card${wide ? " register-card" : ""}`} onSubmit={onSubmit}>
        <div className="brand-mark">ba</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {error && <div className="login-error" role="alert">{error}</div>}
        {children}
      </form>
    </main>
  );
}
