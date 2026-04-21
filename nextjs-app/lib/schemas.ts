import { z } from "zod";

export const taskStatusSchema = z.enum([
  "queued",
  "generating",
  "draft_created",
  "failed",
]);

export const createTaskSchema = z.object({
  siteKey: z.string().trim().min(1, "Site key is required."),
  titleHint: z.string().trim().min(1, "Title hint is required."),
  targetKeyword: z.string().trim().min(1, "Target keyword is required."),
  notes: z.string().trim().optional().default(""),
});

export const createSiteSchema = z.object({
  siteKey: z
    .string()
    .trim()
    .min(1, "Site key is required.")
    .regex(/^[a-z0-9-]+$/, "Site key must use lowercase letters, numbers, and hyphens only."),
  label: z.string().trim().optional().default(""),
  baseUrl: z.string().trim().url("Base URL must be a valid URL."),
  username: z.string().trim().min(1, "WordPress username is required."),
  applicationPassword: z.string().trim().min(1, "Application password is required."),
  categoryId: z.coerce.number().int().positive("Category ID must be a positive integer."),
  defaultTags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const updateSiteSchema = z.object({
  label: z.string().trim().optional().default(""),
  baseUrl: z.string().trim().url("Base URL must be a valid URL."),
  username: z.string().trim().min(1, "WordPress username is required."),
  applicationPassword: z.string().trim().optional().default(""),
  categoryId: z.coerce.number().int().positive("Category ID must be a positive integer."),
  defaultTags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const workerDraftResponseSchema = z.object({
  task_id: z.string().trim().min(1),
  status: taskStatusSchema,
  generated_title: z.string().default(""),
  artifact_path: z.string().nullable().default(null),
  wp_post_id: z.number().nullable().default(null),
  wp_link: z.string().nullable().default(null),
  error_message: z.string().nullable().default(null),
});

export const promptSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required."),
  enabled: z.boolean(),
  description: z.string().trim().optional().default(""),
  instructions: z.string().trim().min(1, "Skill instructions are required."),
});
