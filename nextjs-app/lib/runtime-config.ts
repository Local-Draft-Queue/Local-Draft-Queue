import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { runtimeConfigSchema } from "@/lib/schemas";
import type { RuntimeConfig } from "@/types/runtime-config";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const RUNTIME_CONFIG_FILE = path.join(PROJECT_ROOT, "config", "runtime-settings.json");
const DEFAULT_WP_SITES_FILE = "config/wp-sites.json";
const DEFAULT_DRAFT_OUTPUT_DIR = "generated-drafts";
const DEFAULT_PROMPT_SKILL_FILE = "config/prompt-skill.json";

const LEGACY_PATH_MIGRATIONS: Record<string, string> = {
  "/config/wp-sites.json": DEFAULT_WP_SITES_FILE,
  "/generated-drafts": DEFAULT_DRAFT_OUTPUT_DIR,
  "/prompt-skill.json": DEFAULT_PROMPT_SKILL_FILE,
  "/config/prompt-skill.json": DEFAULT_PROMPT_SKILL_FILE,
};

let writeQueue: Promise<unknown> = Promise.resolve();

function toPortablePath(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeStoredPath(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  const migrated = LEGACY_PATH_MIGRATIONS[trimmed];
  if (migrated) {
    return migrated;
  }

  if (path.isAbsolute(trimmed)) {
    const relativeToProject = path.relative(PROJECT_ROOT, trimmed);
    if (
      relativeToProject &&
      !relativeToProject.startsWith("..") &&
      !path.isAbsolute(relativeToProject)
    ) {
      return toPortablePath(relativeToProject);
    }

    return trimmed;
  }

  return toPortablePath(trimmed.replace(/^[.][/\\]+/, ""));
}

function resolveStoredPath(value: string, fallback: string): string {
  const normalized = normalizeStoredPath(value, fallback);
  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(PROJECT_ROOT, normalized);
}

function normalizeRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  return {
    ...config,
    wpSitesFile: normalizeStoredPath(config.wpSitesFile, DEFAULT_WP_SITES_FILE),
    draftOutputDir: normalizeStoredPath(config.draftOutputDir, DEFAULT_DRAFT_OUTPUT_DIR),
    promptSkillFile: normalizeStoredPath(config.promptSkillFile, DEFAULT_PROMPT_SKILL_FILE),
  };
}

function buildDefaultRuntimeConfig(): RuntimeConfig {
  return normalizeRuntimeConfig(
    runtimeConfigSchema.parse({
      uiAuthPassword: process.env.UI_AUTH_PASSWORD?.trim() ?? "",
      pythonServiceUrl: process.env.PYTHON_SERVICE_URL?.trim() || "http://127.0.0.1:8000",
      aiProvider: process.env.AI_PROVIDER?.trim() === "openai" ? "openai" : "ollama",
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL?.trim() || "qwen2.5-coder:1.5b",
      openAiApiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
      openAiBaseUrl: process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
      openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      wpSitesFile: process.env.WP_SITES_FILE?.trim() || DEFAULT_WP_SITES_FILE,
      draftOutputDir: process.env.DRAFT_OUTPUT_DIR?.trim() || DEFAULT_DRAFT_OUTPUT_DIR,
      promptSkillFile: process.env.PROMPT_SKILL_FILE?.trim() || DEFAULT_PROMPT_SKILL_FILE,
    }),
  );
}

function queueWrite<T>(work: () => Promise<T>): Promise<T> {
  const nextWrite = writeQueue.then(work, work);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

async function ensureRuntimeConfigFile(): Promise<void> {
  await mkdir(path.dirname(RUNTIME_CONFIG_FILE), { recursive: true });
  try {
    await readFile(RUNTIME_CONFIG_FILE, "utf8");
  } catch {
    await writeFile(RUNTIME_CONFIG_FILE, JSON.stringify(buildDefaultRuntimeConfig(), null, 2), "utf8");
  }
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  await ensureRuntimeConfigFile();
  const raw = await readFile(RUNTIME_CONFIG_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
  const merged = normalizeRuntimeConfig(
    runtimeConfigSchema.parse({
      ...buildDefaultRuntimeConfig(),
      ...parsed,
    }),
  );

  return merged;
}

export async function saveRuntimeConfig(input: unknown): Promise<RuntimeConfig> {
  const parsed = normalizeRuntimeConfig(runtimeConfigSchema.parse(input));

  return queueWrite(async () => {
    await ensureRuntimeConfigFile();
    const tempFile = `${RUNTIME_CONFIG_FILE}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(parsed, null, 2), "utf8");
    await rename(tempFile, RUNTIME_CONFIG_FILE);
    return parsed;
  });
}

export async function getResolvedRuntimeConfig(): Promise<RuntimeConfig> {
  const config = await getRuntimeConfig();
  return {
    ...config,
    wpSitesFile: resolveStoredPath(config.wpSitesFile, DEFAULT_WP_SITES_FILE),
    draftOutputDir: resolveStoredPath(config.draftOutputDir, DEFAULT_DRAFT_OUTPUT_DIR),
    promptSkillFile: resolveStoredPath(config.promptSkillFile, DEFAULT_PROMPT_SKILL_FILE),
  };
}
