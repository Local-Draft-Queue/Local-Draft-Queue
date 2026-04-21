"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import type { WordPressSite } from "@/types/site";
import type { BlogTask } from "@/types/task";

interface TaskEditorFormProps {
  task: BlogTask;
  sites: WordPressSite[];
}

export function TaskEditorForm({ task, sites }: TaskEditorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    siteKey: task.siteKey,
    titleHint: task.titleHint,
    targetKeyword: task.targetKeyword,
    notes: task.notes,
  });
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirmUpdate() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to update task."));
          return;
        }

        setConfirmOpen(false);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <form className="task-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Edit Task</p>
        <h3>Update queue inputs</h3>

      <label>
        <span>Site Key</span>
        <select
          value={form.siteKey}
          onChange={(event) => updateField("siteKey", event.target.value)}
          required
          disabled={isPending}
        >
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
          required
          disabled={isPending}
        />
      </label>

      <label>
        <span>Target Keyword</span>
        <input
          value={form.targetKeyword}
          onChange={(event) => updateField("targetKeyword", event.target.value)}
          required
          disabled={isPending}
        />
      </label>

      <label>
        <span>Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={7}
          disabled={isPending}
        />
      </label>

      <div className="form-footer">
        <button className="action-button action-button-solid" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Update Task"}
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>
        <p className="muted">Updating a task resets it to `queued` and clears previous draft results.</p>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Update task?"
        description="This will overwrite the current task inputs and reset the task back to queued."
        confirmLabel={isPending ? "Saving..." : "Update Task"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmUpdate}
      >
        <p><strong>Site:</strong> {form.siteKey}</p>
        <p><strong>Title hint:</strong> {form.titleHint}</p>
        <p><strong>Keyword:</strong> {form.targetKeyword}</p>
      </ConfirmModal>
    </>
  );
}
