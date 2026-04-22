import { createTaskSchema, workerDraftResponseSchema } from "@/lib/schemas";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { startTaskGeneration, updateTask } from "@/lib/tasks";
import type { BlogTask, CreateTaskInput, WorkerDraftRequest, WorkerDraftResponse } from "@/types/task";

class WorkerRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getPythonServiceUrl(): Promise<string> {
  const config = await getRuntimeConfig();
  const serviceUrl = config.pythonServiceUrl.trim();
  if (!serviceUrl) {
    throw new WorkerRequestError("PYTHON_SERVICE_URL is not configured.", 500);
  }
  return serviceUrl.replace(/\/$/, "");
}

export function normalizeCreateTaskInput(input: unknown): CreateTaskInput {
  const parsed = createTaskSchema.parse(input);
  return {
    siteKey: parsed.siteKey,
    titleHint: parsed.titleHint,
    targetKeyword: parsed.targetKeyword,
    notes: parsed.notes,
  };
}

function extractErrorDetail(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("detail" in payload)) {
    return null;
  }

  const detail = payload.detail;
  return typeof detail === "string" && detail.trim() ? detail : null;
}

async function requestDraftGeneration(task: BlogTask): Promise<WorkerDraftResponse> {
  const workerPayload: WorkerDraftRequest = {
    task_id: task.id,
    site_key: task.siteKey,
    title_hint: task.titleHint,
    target_keyword: task.targetKeyword,
    notes: task.notes || undefined,
  };

  const response = await fetch(`${await getPythonServiceUrl()}/generate-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workerPayload),
    cache: "no-store",
  });

  const rawText = await response.text();
  let parsedJson: unknown = null;

  if (rawText) {
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new WorkerRequestError("Python worker returned non-JSON output.", response.status);
    }
  }

  const detail = extractErrorDetail(parsedJson);
  if (!response.ok && detail) {
    throw new WorkerRequestError(detail, response.status);
  }

  try {
    return workerDraftResponseSchema.parse(parsedJson);
  } catch {
    throw new WorkerRequestError("Python worker returned an invalid response payload.", response.status);
  }
}

export async function generateDraftForTask(taskId: string): Promise<BlogTask> {
  const markedGenerating = await startTaskGeneration(taskId);

  if (!markedGenerating) {
    throw new WorkerRequestError("Task not found.", 404);
  }

  try {
    const workerResult = await requestDraftGeneration(markedGenerating);
    const updatedTask = await updateTask(taskId, (current) => ({
      ...current,
      status: workerResult.status,
      generatedTitle: workerResult.generated_title ?? "",
      artifactPath: workerResult.artifact_path ?? "",
      wpPostId: workerResult.wp_post_id ?? null,
      wpLink: workerResult.wp_link ?? "",
      errorMessage: workerResult.error_message ?? "",
    }));

    if (!updatedTask) {
      throw new WorkerRequestError("Task disappeared during update.", 500);
    }

    return updatedTask;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed.";
    const failedTask = await updateTask(taskId, (current) => ({
      ...current,
      status: "failed",
      errorMessage: message,
    }));

    if (!failedTask) {
      throw new WorkerRequestError(message, 500);
    }

    return failedTask;
  }
}

export { WorkerRequestError };
