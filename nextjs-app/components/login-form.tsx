"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

interface LoginFormProps {
  authConfigured: boolean;
}

export function LoginForm({ authConfigured }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authConfigured) {
      setError("UI_AUTH_PASSWORD is not configured yet.");
      return;
    }

    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            next: searchParams.get("next") ?? "/dashboard",
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to sign in."));
          return;
        }

        const redirectTo =
          typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/")
            ? payload.redirectTo
            : "/dashboard";

        router.push(redirectTo);
        router.refresh();
      })();
    });
  }

  return (
    <form className="panel form-panel login-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Protected Access</p>
          <h2>Sign in</h2>
        </div>
      </div>

      <p className="muted">
        This UI is protected with a local password. Enter the configured admin password to
        access tasks, sites, and prompt skills.
      </p>

      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter UI password"
          autoComplete="current-password"
          required
          disabled={!authConfigured || isPending}
        />
      </label>

      {!authConfigured ? (
        <p className="inline-error">
          No UI password is configured yet. Open the <Link href="/setup">setup page</Link> to
          create the local admin password first.
        </p>
      ) : null}

      <div className="form-footer">
        <button className="action-button action-button-solid" type="submit" disabled={isPending || !authConfigured}>
          {isPending ? "Signing in..." : "Sign In"}
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>
    </form>
  );
}
