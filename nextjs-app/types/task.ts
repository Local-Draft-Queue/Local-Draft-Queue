export type TaskStatus = "queued" | "generating" | "draft_created" | "failed";

export interface BlogTask {
  id: string;
  siteKey: string;
  titleHint: string;
  targetKeyword: string;
  notes: string;
  status: TaskStatus;
  generatedTitle: string;
  artifactPath: string;
  wpPostId: number | null;
  wpLink: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  siteKey: string;
  titleHint: string;
  targetKeyword: string;
  notes?: string;
}

export interface TaskStore {
  tasks: BlogTask[];
}

export interface WorkerDraftRequest {
  task_id: string;
  site_key: string;
  title_hint: string;
  target_keyword: string;
  notes?: string;
}

export interface WorkerDraftResponse {
  task_id: string;
  status: TaskStatus;
  generated_title: string;
  artifact_path: string | null;
  wp_post_id: number | null;
  wp_link: string | null;
  error_message: string | null;
}
