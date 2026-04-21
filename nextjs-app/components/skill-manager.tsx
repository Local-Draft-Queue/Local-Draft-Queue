"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import type { PromptSkillConfig } from "@/types/skill";

interface SkillManagerProps {
  initialSkill: PromptSkillConfig;
}

export function SkillManager({ initialSkill }: SkillManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialSkill);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof PromptSkillConfig>(field: K, value: PromptSkillConfig[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleSave() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch("/api/skill", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to save skill configuration."));
          return;
        }

        setConfirmOpen(false);
        router.refresh();
      })();
    });
  }

  function handleReset() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch("/api/skill", {
          method: "POST",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to reset skill configuration."));
          return;
        }

        setForm(payload.skill as PromptSkillConfig);
        setResetOpen(false);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <div className="dashboard-grid">
        <section className="hero-copy">
          <p className="eyebrow">Prompt Skill</p>
          <h2>Control the writing skill from the UI.</h2>
          <p>
            This config is shared by the Next.js app and the Python worker. Update the
            active instructions here instead of editing Python source files.
          </p>
          <div className="skill-notes">
            <p>
              Dynamic rules still come from the task itself, including the target keyword,
              notes, and any internal URLs you paste into a task.
            </p>
            <p>
              Changes apply to new generations immediately because the worker reads this
              config on each request.
            </p>
          </div>
        </section>

        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Active Skill</p>
              <h2>Prompt Configuration</h2>
            </div>
          </div>

          <label>
            <span>Skill Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Default SEO Blog Skill"
              required
            />
          </label>

          <label className="toggle-row">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => updateField("enabled", event.target.checked)}
            />
          </label>

          <label>
            <span>Description</span>
            <input
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Short summary of what this skill is for"
            />
          </label>

          <label>
            <span>Instructions</span>
            <textarea
              className="skill-textarea"
              value={form.instructions}
              onChange={(event) => updateField("instructions", event.target.value)}
              placeholder="Write the skill instructions that should be injected into the active generation prompt."
              required
            />
          </label>

          <div className="form-footer">
            <div className="button-row">
              <button className="action-button action-button-solid" type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Skill"}
              </button>
              <button
                className="action-button"
                type="button"
                onClick={() => setResetOpen(true)}
                disabled={isPending}
              >
                Reset Default
              </button>
            </div>
            {error ? <p className="inline-error">{error}</p> : null}
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Save skill changes?"
        description="This will update the active prompt skill used by the worker for new draft generations."
        confirmLabel={isPending ? "Saving..." : "Save Skill"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSave}
      >
        <p><strong>Name:</strong> {form.name}</p>
        <p><strong>Enabled:</strong> {form.enabled ? "Yes" : "No"}</p>
        <p><strong>Description:</strong> {form.description || "No description"}</p>
      </ConfirmModal>

      <ConfirmModal
        open={resetOpen}
        title="Reset to default skill?"
        description="This will overwrite the current prompt skill with the default SEO writing instructions."
        confirmLabel={isPending ? "Resetting..." : "Reset Skill"}
        tone="danger"
        onCancel={() => setResetOpen(false)}
        onConfirm={handleReset}
      >
        <p>The current custom instructions will be replaced.</p>
      </ConfirmModal>
    </>
  );
}
