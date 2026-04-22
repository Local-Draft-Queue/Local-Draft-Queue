from __future__ import annotations

from app.models import GenerateDraftRequest, GeneratedDraft, PromptSkillConfig
from app.services.seo_skill import build_seo_skill_block


def build_generation_system_prompt(
    task: GenerateDraftRequest,
    prompt_skill: PromptSkillConfig,
    stronger_retry: bool = False,
) -> str:
    seo_skill_block = build_seo_skill_block(task, prompt_skill)
    retry_block = ""
    if stronger_retry:
        retry_block = """
RETRY MODE:
- Your previous answer was invalid.
- Return a single JSON object only.
- Do not add any commentary before or after the JSON.
- Do not wrap the JSON in markdown fences.
- If you cannot comply, still return a JSON object with best-effort valid values.
""".strip()

    return f"""
You are generating a WordPress draft for a content operations pipeline.

Return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown.
Do NOT include backticks.
Do NOT include any text before or after the JSON object.

The JSON object must match this exact schema and keys:
{{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "content_html": "string",
  "seo_title": "string",
  "meta_description": "string",
  "tags": ["string"]
}}

Content rules:
- Write in clear, natural English.
- Target keyword must appear naturally in the title, excerpt, and content_html.
- content_html must be valid HTML only.
- content_html should target at least 1500 words when possible and must not be shallow.
- content_html must be at least 900 words.
- content_html must contain at least three <h2> headings.
- content_html must contain at least six substantial paragraphs.
- Each <h2> section should have multiple paragraphs, not just one short block.
- Avoid these phrases: "in conclusion", "ever-evolving", "delve into", "game changer", "at the end of the day".
- Do not mention being an AI.
- Do not output placeholders like lorem ipsum or TODO.
- Keep tags short and relevant.
- Slug must be lowercase and hyphenated.

{seo_skill_block}

{retry_block}
""".strip()


def build_generation_user_prompt(task: GenerateDraftRequest) -> str:
    return f"""
Generate the draft using this task input:
- site_key: {task.site_key}
- title_hint: {task.title_hint}
- target_keyword: {task.target_keyword}
- notes: {task.notes or "None"}
""".strip()


def build_validation_repair_system_prompt(
    task: GenerateDraftRequest,
    prompt_skill: PromptSkillConfig,
    validation_errors: list[str],
) -> str:
    seo_skill_block = build_seo_skill_block(task, prompt_skill)
    errors = "\n".join(f"- {item}" for item in validation_errors)

    return f"""
You are repairing a previously generated WordPress draft for a content operations pipeline.

Return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown.
Do NOT include backticks.
Do NOT include any text before or after the JSON object.

The JSON object must match this exact schema and keys:
{{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "content_html": "string",
  "seo_title": "string",
  "meta_description": "string",
  "tags": ["string"]
}}

You must repair the draft below so it passes validation.
The most important requirement is that content_html must be long enough and structurally complete.

Validation errors to fix:
{errors}

Repair rules:
- Keep the same topic, keyword, and overall angle.
- Expand content_html toward 1500 words when possible.
- Expand content_html to at least 950 words.
- Include at least three <h2> headings.
- Include multiple detailed paragraphs under each heading.
- Keep output as valid HTML in content_html only.
- Keep the target keyword natural in the title, excerpt, and content_html.
- Avoid these phrases: "in conclusion", "ever-evolving", "delve into", "game changer", "at the end of the day".
- Do not mention being an AI.

{seo_skill_block}
""".strip()


def build_validation_repair_user_prompt(
    task: GenerateDraftRequest,
    draft: GeneratedDraft,
) -> str:
    return f"""
Repair the draft using this task input:
- site_key: {task.site_key}
- title_hint: {task.title_hint}
- target_keyword: {task.target_keyword}
- notes: {task.notes or "None"}

Current draft JSON:
{draft.model_dump_json(indent=2)}
""".strip()
