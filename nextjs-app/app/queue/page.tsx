import { TaskTable } from "@/components/task-table";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const tasks = await listTasks();

  return (
    <div className="hero-grid">
      <section className="hero-copy">
        <p className="eyebrow">Queue Monitor</p>
        <h2>Every draft task, one view.</h2>
        <p>
          Use this page to monitor generation attempts, draft creation results, and
          WordPress links without leaving the repository.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Throughput</p>
            <h2>{tasks.length} tasks tracked</h2>
          </div>
        </div>
        <p className="muted">
          The queue is stored locally in <code>nextjs-app/data/tasks.json</code> for this MVP.
        </p>
      </section>

      <section style={{ gridColumn: "1 / -1" }}>
        <TaskTable tasks={tasks} />
      </section>
    </div>
  );
}
