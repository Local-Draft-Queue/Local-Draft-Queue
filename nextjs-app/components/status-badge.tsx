import type { TaskStatus } from "@/types/task";

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: "Queued",
  generating: "Generating",
  draft_created: "Draft Created",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}
