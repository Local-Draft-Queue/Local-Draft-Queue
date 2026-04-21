"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import type { WordPressSite } from "@/types/site";

const INITIAL_FORM = (siteKey = "") => ({
  siteKey,
  titleHint: "",
  targetKeyword: "",
  notes: "",
});

type TaskFormState = ReturnType<typeof INITIAL_FORM>;

export function CreateTaskForm({ sites = [] }: { sites?: WordPressSite[] }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM(sites[0]?.siteKey ?? ""));
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasSites = sites.length > 0;

  function updateField(field: keyof TaskFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirmCreate() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to create task."));
          return;
        }

        setForm(INITIAL_FORM(sites[0]?.siteKey ?? ""));
        setConfirmOpen(false);
        router.push(`/tasks/${payload.task.id}`);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <p className="eyebrow">New Task</p>
          <h2>Create a blog draft job</h2>
        </div>

      <label>
        <span>Site Key</span>
        <select
          value={form.siteKey}
          onChange={(event) => updateField("siteKey", event.target.value)}
          required
          disabled={!hasSites || isPending}
        >
          {hasSites ? null : <option value="">Add a saved WordPress site first</option>}
          {sites.map((site) => (
            <option key={site.siteKey} value={site.siteKey}>
              {site.label} ({site.siteKey})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Title Hint</span>
        <input
          value={form.titleHint}
          onChange={(event) => updateField("titleHint", event.target.value)}
          placeholder="How local AI drafting changes publishing ops"
          required
          disabled={!hasSites || isPending}
        />
      </label>

      <label>
        <span>Target Keyword</span>
        <input
          value={form.targetKeyword}
          onChange={(event) => updateField("targetKeyword", event.target.value)}
          placeholder="local AI blog automation"
          required
          disabled={!hasSites || isPending}
        />
      </label>

      <label>
        <span>Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Paste source blog content, internal URLs, CTA notes, tone rules, or section requirements here."
          rows={7}
          disabled={!hasSites || isPending}
        />
      </label>

      <div className="form-footer">
        <button
          className="action-button action-button-solid"
          type="submit"
          disabled={isPending || !hasSites}
        >
          {isPending ? "Creating..." : "Create Task"}
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>
        {!hasSites ? (
          <p className="muted">
            Save at least one site in <strong>Sites</strong> before creating tasks.
          </p>
        ) : null}
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Create task?"
        description="This will add a new queued draft task using the current inputs."
        confirmLabel={isPending ? "Creating..." : "Create Task"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmCreate}
      >
        <p><strong>Site:</strong> {form.siteKey || "Not selected"}</p>
        <p><strong>Title hint:</strong> {form.titleHint || "Not provided"}</p>
        <p><strong>Keyword:</strong> {form.targetKeyword || "Not provided"}</p>
      </ConfirmModal>
    </>
  );
}
