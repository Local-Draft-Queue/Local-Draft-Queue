"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import type { RuntimeConfig } from "@/types/runtime-config";

interface SetupManagerProps {
  initialConfig: RuntimeConfig;
  authConfigured: boolean;
}

export function SetupManager({ initialConfig, authConfigured }: SetupManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialConfig);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof RuntimeConfig>(field: K, value: RuntimeConfig[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      void (async () => {
        setError("");
        setSavedMessage("");

        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to save runtime settings."));
          return;
        }

        setSavedMessage("Settings saved.");
        router.refresh();

        if (!authConfigured && form.uiAuthPassword.trim()) {
          router.push("/dashboard");
        }
      })();
    });
  }

  return (
    <div className="dashboard-grid">
      <section className="hero-copy">
        <p className="eyebrow">Runtime Settings</p>
        <h2>Manage auth, worker URLs, and AI providers from the UI.</h2>
        <p>
          These values are stored in <code>config/runtime-settings.json</code> so the Next.js
          app and the Python worker can read the same live configuration without relying on
          local env files.
        </p>

        <div className="skill-notes">
          <p>
            Choose Ollama for local generation, switch to OpenAI directly, or keep Ollama as
            the primary provider and enable OpenAI fallback when the local model is unavailable.
          </p>
          <p>
            Site credentials and prompt instructions stay in their existing UI pages, but their
            file paths are editable here if you want to relocate those shared files.
          </p>
        </div>
      </section>

      <form className="panel form-panel settings-panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shared Config</p>
            <h2>App Settings</h2>
          </div>
        </div>

        <div className="settings-section">
          <h3>Access</h3>
          <label>
            <span>UI Admin Password</span>
            <input
              type="password"
              value={form.uiAuthPassword}
              onChange={(event) => updateField("uiAuthPassword", event.target.value)}
              placeholder="Set the password used to sign in to the dashboard"
            />
          </label>

          <label>
            <span>Python Worker URL</span>
            <input
              value={form.pythonServiceUrl}
              onChange={(event) => updateField("pythonServiceUrl", event.target.value)}
              placeholder="http://127.0.0.1:8000"
              required
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>AI Provider</h3>
          <label>
            <span>Primary Provider</span>
            <select
              value={form.aiProvider}
              onChange={(event) => updateField("aiProvider", event.target.value as RuntimeConfig["aiProvider"])}
            >
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="toggle-row">
            <span>Use OpenAI if Ollama fails</span>
            <input
              type="checkbox"
              checked={form.enableOpenAiFallback}
              onChange={(event) => updateField("enableOpenAiFallback", event.target.checked)}
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>Ollama</h3>
          <label>
            <span>Ollama Base URL</span>
            <input
              value={form.ollamaBaseUrl}
              onChange={(event) => updateField("ollamaBaseUrl", event.target.value)}
              placeholder="http://localhost:11434"
              required
            />
          </label>

          <label>
            <span>Ollama Model</span>
            <input
              value={form.ollamaModel}
              onChange={(event) => updateField("ollamaModel", event.target.value)}
              placeholder="qwen2.5-coder:1.5b"
              required
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>OpenAI</h3>
          <label>
            <span>OpenAI API Key</span>
            <input
              type="password"
              value={form.openAiApiKey}
              onChange={(event) => updateField("openAiApiKey", event.target.value)}
              placeholder="sk-..."
            />
          </label>

          <label>
            <span>OpenAI Base URL</span>
            <input
              value={form.openAiBaseUrl}
              onChange={(event) => updateField("openAiBaseUrl", event.target.value)}
              placeholder="https://api.openai.com/v1"
              required
            />
          </label>

          <label>
            <span>OpenAI Model</span>
            <input
              value={form.openAiModel}
              onChange={(event) => updateField("openAiModel", event.target.value)}
              placeholder="gpt-4o-mini"
              required
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>Shared Project Paths</h3>
          <p>
            Use repo-relative paths like <code>config/wp-sites.json</code> to keep the config
            portable between machines.
          </p>
          <label>
            <span>WordPress Sites File</span>
            <input
              value={form.wpSitesFile}
              onChange={(event) => updateField("wpSitesFile", event.target.value)}
              placeholder="config/wp-sites.json"
              required
            />
          </label>

          <label>
            <span>Draft Output Directory</span>
            <input
              value={form.draftOutputDir}
              onChange={(event) => updateField("draftOutputDir", event.target.value)}
              placeholder="generated-drafts"
              required
            />
          </label>

          <label>
            <span>Prompt Skill File</span>
            <input
              value={form.promptSkillFile}
              onChange={(event) => updateField("promptSkillFile", event.target.value)}
              placeholder="config/prompt-skill.json"
              required
            />
          </label>
        </div>

        <div className="form-footer">
          <button className="action-button action-button-solid" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </button>
          {savedMessage ? <p className="settings-success">{savedMessage}</p> : null}
          {error ? <p className="inline-error">{error}</p> : null}
        </div>
      </form>
    </div>
  );
}
