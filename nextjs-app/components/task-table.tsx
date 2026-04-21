import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { TaskActions } from "@/components/task-actions";
import type { BlogTask } from "@/types/task";

export function TaskTable({ tasks }: { tasks: BlogTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="panel empty-state">
        <p className="eyebrow">Queue</p>
        <h2>No tasks yet</h2>
        <p>Create the first task from the dashboard to start the pipeline.</p>
      </div>
    );
  }

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <p className="eyebrow">Queue</p>
        <h2>Task pipeline</h2>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Site</th>
              <th>Keyword</th>
              <th>Status</th>
              <th>WordPress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <Link href={`/tasks/${task.id}`} className="task-link">
                    {task.generatedTitle || task.titleHint}
                  </Link>
                  <p className="muted">{new Date(task.updatedAt).toLocaleString()}</p>
                </td>
                <td>{task.siteKey}</td>
                <td>{task.targetKeyword}</td>
                <td>
                  <StatusBadge status={task.status} />
                </td>
                <td>
                  {task.wpLink ? (
                    <a href={task.wpLink} target="_blank" rel="noreferrer" className="wp-link">
                      Open Draft
                    </a>
                  ) : (
                    <span className="muted">Pending</span>
                  )}
                </td>
                <td>
                  <TaskActions task={task} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
