"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import type { BlogTask } from "@/types/task";

interface TaskActionsProps {
  task: BlogTask;
  showEditLink?: boolean;
  redirectOnDelete?: string;
}

export function TaskActions({
  task,
  showEditLink = true,
  redirectOnDelete,
}: TaskActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const endpoint =
    task.status === "failed"
      ? `/api/tasks/${task.id}/retry`
      : `/api/tasks/${task.id}/generate`;

  const label = task.status === "failed" ? "Retry" : "Generate Draft";
  const disabled = isPending || task.status === "generating" || task.status === "draft_created";

  function handleClick() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch(endpoint, {
          method: "POST",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? payload?.task?.errorMessage ?? "Request failed."));
        }
        router.refresh();
      })();
    });
  }

  function handleDelete() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Delete failed."));
          return;
        }

        setDeleteConfirmOpen(false);
        if (redirectOnDelete) {
          router.push(redirectOnDelete);
        }
        router.refresh();
      })();
    });
  }

  return (
    <>
      <div className="task-actions">
        <button className="action-button" type="button" onClick={handleClick} disabled={disabled}>
          {isPending ? "Working..." : label}
        </button>
        {showEditLink ? (
          <Link href={`/tasks/${task.id}`} className="action-button task-link-button">
            Edit
          </Link>
        ) : null}
        <button
          className="action-button"
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isPending}
        >
          Delete
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete task?"
        description="This will remove the task from the queue and delete its local markdown artifact if one exists."
        confirmLabel={isPending ? "Deleting..." : "Delete Task"}
        tone="danger"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      >
        <p><strong>Task:</strong> {task.generatedTitle || task.titleHint}</p>
        <p><strong>Keyword:</strong> {task.targetKeyword}</p>
      </ConfirmModal>
    </>
  );
}
