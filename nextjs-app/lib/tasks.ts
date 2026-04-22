import { randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

import type { BlogTask, CreateTaskInput, TaskStore } from "@/types/task";

const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json");
const GENERATABLE_STATUSES = new Set<BlogTask["status"]>(["queued", "failed"]);

let writeQueue: Promise<unknown> = Promise.resolve();

export class TaskStateConflictError extends Error {}

async function ensureStoreFile(): Promise<void> {
  await mkdir(path.dirname(TASKS_FILE), { recursive: true });
  try {
    await readFile(TASKS_FILE, "utf8");
  } catch {
    await writeFile(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2), "utf8");
  }
}

async function readStore(): Promise<TaskStore> {
  await ensureStoreFile();
  const raw = await readFile(TASKS_FILE, "utf8");
  const parsed = JSON.parse(raw) as TaskStore;
  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  };
}

async function writeStore(store: TaskStore): Promise<void> {
  const tempFile = `${TASKS_FILE}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await rename(tempFile, TASKS_FILE);
}

function queueWrite<T>(work: () => Promise<T>): Promise<T> {
  const nextWrite = writeQueue.then(work, work);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

export async function listTasks(): Promise<BlogTask[]> {
  const store = await readStore();
  return [...store.tasks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getTaskById(id: string): Promise<BlogTask | null> {
  const tasks = await listTasks();
  return tasks.find((task) => task.id === id) ?? null;
}

export async function createTask(input: CreateTaskInput): Promise<BlogTask> {
  return queueWrite(async () => {
    const store = await readStore();
    const timestamp = new Date().toISOString();
    const task: BlogTask = {
      id: randomUUID(),
      siteKey: input.siteKey.trim(),
      titleHint: input.titleHint.trim(),
      targetKeyword: input.targetKeyword.trim(),
      notes: input.notes?.trim() ?? "",
      status: "queued",
      generatedTitle: "",
      artifactPath: "",
      wpPostId: null,
      wpLink: "",
      errorMessage: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.tasks.unshift(task);
    await writeStore(store);
    return task;
  });
}

export async function updateTask(
  id: string,
  mutate: (task: BlogTask) => BlogTask,
): Promise<BlogTask | null> {
  return queueWrite(async () => {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return null;
    }

    const existing = store.tasks[index];
    const nextTask = {
      ...mutate(existing),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    store.tasks[index] = nextTask;
    await writeStore(store);
    return nextTask;
  });
}

export async function startTaskGeneration(id: string): Promise<BlogTask | null> {
  return queueWrite(async () => {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return null;
    }

    const existing = store.tasks[index];
    if (!GENERATABLE_STATUSES.has(existing.status)) {
      if (existing.status === "generating") {
        throw new TaskStateConflictError("Task generation is already in progress.");
      }

      throw new TaskStateConflictError("Only queued or failed tasks can start generation.");
    }

    const nextTask: BlogTask = {
      ...existing,
      status: "generating",
      errorMessage: "",
      updatedAt: new Date().toISOString(),
    };

    store.tasks[index] = nextTask;
    await writeStore(store);
    return nextTask;
  });
}

export async function replaceTaskInput(
  id: string,
  input: CreateTaskInput,
): Promise<BlogTask | null> {
  return queueWrite(async () => {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return null;
    }

    const existing = store.tasks[index];
    if (existing.status === "generating") {
      throw new TaskStateConflictError("Task cannot be edited while generation is in progress.");
    }

    const nextTask: BlogTask = {
      ...existing,
      siteKey: input.siteKey.trim(),
      titleHint: input.titleHint.trim(),
      targetKeyword: input.targetKeyword.trim(),
      notes: input.notes?.trim() ?? "",
      status: "queued",
      generatedTitle: "",
      artifactPath: "",
      wpPostId: null,
      wpLink: "",
      errorMessage: "",
      updatedAt: new Date().toISOString(),
    };

    store.tasks[index] = nextTask;
    await writeStore(store);
    return nextTask;
  });
}

export async function deleteTask(id: string): Promise<boolean> {
  return queueWrite(async () => {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return false;
    }

    const existing = store.tasks[index];
    if (existing.status === "generating") {
      throw new TaskStateConflictError("Task cannot be deleted while generation is in progress.");
    }

    const [removedTask] = store.tasks.splice(index, 1);
    await writeStore(store);

    if (removedTask?.artifactPath) {
      await unlink(removedTask.artifactPath).catch(() => undefined);
    }

    return true;
  });
}
