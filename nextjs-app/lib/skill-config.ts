import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { getResolvedRuntimeConfig } from "@/lib/runtime-config";
import { promptSkillSchema } from "@/lib/schemas";
import type { PromptSkillConfig } from "@/types/skill";

const DEFAULT_SKILL: PromptSkillConfig = {
  name: "Default SEO Blog Skill",
  enabled: true,
  description: "Base long-form SEO and readability guidance injected into Ollama prompts.",
  instructions: [
    "- Use a polished, confident, human-friendly tone.",
    "- Sound natural, conversational, and professional, not robotic or generic.",
    "- Do not use emojis.",
    "- Avoid filler phrases and AI-style wording.",
    "- Rewrite the title to be engaging and SEO-friendly.",
    "- Keep the title between 50 and 60 characters when possible.",
    "- Treat the `title` field as the only H1. Do not place another H1 inside `content_html`.",
    "- Use H2 for main sections and H3 for subsections inside `content_html`.",
    "- Keep paragraphs short, usually 2 to 4 lines.",
    "- Maintain smooth transitions and a logical flow from introduction to conclusion.",
    "- Write a keyword-rich introduction without sounding forced.",
    "- Use keyword-rich, meta-friendly subheadings.",
    "- Expand the article toward 1500 words when the topic supports it.",
    "- Ensure strong on-page SEO structure without keyword stuffing.",
    "- If notes include existing blog content, improve and expand that content instead of replacing the topic.",
    "- If notes include raw URLs, treat them as required internal links to use naturally.",
    "- Map end-of-post deliverables into the structured JSON fields:",
    "  - `slug` = suggested URL slug",
    "  - `meta_description` = 155 to 160 characters when possible",
    "  - `tags` = concise SEO tags as an array of strings",
    "- Do not include the question about creating an illustration image inside `content_html`, because this system creates WordPress drafts from the structured fields.",
  ].join("\n"),
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function getSkillFile(): Promise<string> {
  const config = await getResolvedRuntimeConfig();
  return config.promptSkillFile;
}

async function ensureSkillFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify(DEFAULT_SKILL, null, 2), "utf8");
  }
}

function queueWrite<T>(work: () => Promise<T>): Promise<T> {
  const nextWrite = writeQueue.then(work, work);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

export async function getPromptSkill(): Promise<PromptSkillConfig> {
  const skillFile = await getSkillFile();
  await ensureSkillFile(skillFile);
  const raw = await readFile(skillFile, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return promptSkillSchema.parse(parsed);
}

export async function savePromptSkill(input: unknown): Promise<PromptSkillConfig> {
  const parsed = promptSkillSchema.parse(input);

  return queueWrite(async () => {
    const skillFile = await getSkillFile();
    await ensureSkillFile(skillFile);
    const tempFile = `${skillFile}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(parsed, null, 2), "utf8");
    await rename(tempFile, skillFile);
    return parsed;
  });
}

export function getDefaultPromptSkill(): PromptSkillConfig {
  return DEFAULT_SKILL;
}
