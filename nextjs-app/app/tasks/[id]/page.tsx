import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { TaskActions } from "@/components/task-actions";
import { TaskEditorForm } from "@/components/task-editor-form";
import { requirePageAuth } from "@/lib/auth-guards";
import { listSites } from "@/lib/sites";
import { getTaskById } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageAuth({ nextPath: `/tasks/${id}` });
  const [task, sites] = await Promise.all([getTaskById(id), listSites()]);

  if (!task) {
    notFound();
  }

  return (
    <div className="task-grid">
      <section className="task-hero panel">
        <div>
          <p className="eyebrow">Task Detail</p>
          <h2>{task.generatedTitle || task.titleHint}</h2>
        </div>
        <div>
          <StatusBadge status={task.status} />
        </div>
        <p>
          <strong>Target keyword:</strong> {task.targetKeyword}
        </p>
        <p>{task.notes || "No notes were added for this task."}</p>
        <TaskActions task={task} showEditLink={false} redirectOnDelete="/queue" />
      </section>

      <aside className="task-meta">
        <TaskEditorForm task={task} sites={sites} />

        <section className="task-card">
          <p className="eyebrow">WordPress</p>
          <h3>Draft destination</h3>
          <ul className="task-meta-list">
            <li>
              <span>Site key</span>
              <strong>{task.siteKey}</strong>
            </li>
            <li>
              <span>Post ID</span>
              <strong>{task.wpPostId ?? "Pending"}</strong>
            </li>
            <li>
              <span>Draft link</span>
              <strong>
                {task.wpLink ? (
                  <a href={task.wpLink} target="_blank" rel="noreferrer" className="wp-link">
                    Open draft
                  </a>
                ) : (
                  "Pending"
                )}
              </strong>
            </li>
          </ul>
        </section>

        <section className="task-card">
          <p className="eyebrow">Artifact</p>
          <h3>Local markdown</h3>
          <ul className="task-meta-list">
            <li>
              <span>Saved file</span>
              <strong>{task.artifactPath || "Pending"}</strong>
            </li>
          </ul>
        </section>

        <section className="task-card">
          <p className="eyebrow">Audit</p>
          <h3>Timeline</h3>
          <ul className="task-meta-list">
            <li>
              <span>Created</span>
              <strong>{new Date(task.createdAt).toLocaleString()}</strong>
            </li>
            <li>
              <span>Updated</span>
              <strong>{new Date(task.updatedAt).toLocaleString()}</strong>
            </li>
            <li>
              <span>Error</span>
              <strong className={task.errorMessage ? "error-copy" : ""}>
                {task.errorMessage || "None"}
              </strong>
            </li>
          </ul>
        </section>

        <section className="task-card">
          <p className="eyebrow">Navigation</p>
          <h3>Move around</h3>
          <p>
            <Link href="/queue" className="wp-link">
              Back to queue
            </Link>
          </p>
        </section>
      </aside>
    </div>
  );
}
