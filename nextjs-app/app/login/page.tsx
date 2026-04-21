import { LoginForm } from "@/components/login-form";
import { isUiAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const authConfigured = isUiAuthConfigured();

  return (
    <div className="hero-grid auth-grid">
      <section className="hero-copy">
        <p className="eyebrow">Local Access Control</p>
        <h2>Protect the dashboard with a single admin password.</h2>
        <p>
          This login only protects the Next.js UI and its local task, site, and prompt-skill
          endpoints. The Python worker remains a separate local service.
        </p>
      </section>

      <LoginForm authConfigured={authConfigured} />
    </div>
  );
}
