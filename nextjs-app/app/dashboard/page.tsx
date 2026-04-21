import Link from "next/link";

import { CreateTaskForm } from "@/components/create-task-form";
import { TaskTable } from "@/components/task-table";
import { listSites } from "@/lib/sites";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tasks = await listTasks();
  const sites = await listSites();
  const queued = tasks.filter((task) => task.status === "queued").length;
  const generating = tasks.filter((task) => task.status === "generating").length;
  const completed = tasks.filter((task) => task.status === "draft_created").length;

  return (
    <div className="dashboard-grid">
      <section className="hero-copy">
        <p className="eyebrow">Pipeline Control</p>
        <h2>Queue local AI drafts before they touch WordPress.</h2>
        <p>
          This MVP routes a typed task from Next.js into a FastAPI worker, forces
          strict JSON from Ollama, validates the result, and creates a WordPress draft.
        </p>

        <div className="hero-stats">
          <article className="stat-card">
            <strong>{queued}</strong>
            <span>Queued</span>
          </article>
          <article className="stat-card">
            <strong>{generating}</strong>
            <span>Generating</span>
          </article>
          <article className="stat-card">
            <strong>{completed}</strong>
            <span>Drafts Created</span>
          </article>
        </div>

        <p className="muted">
          Saved {sites.length} site{sites.length === 1 ? "" : "s"}.
          {" "}
          <Link href="/sites">Manage WordPress sites</Link>.
        </p>
      </section>

      <CreateTaskForm sites={sites} />

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Recent Tasks</p>
            <h2>Last updated items</h2>
          </div>
        </div>
        <TaskTable tasks={tasks.slice(0, 6)} />
      </section>
    </div>
  );
}
