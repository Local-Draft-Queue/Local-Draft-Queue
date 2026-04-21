from __future__ import annotations

import re

from app.models import GenerateDraftRequest, PromptSkillConfig


URL_PATTERN = re.compile(r"https?://[^\s<>()]+")


def extract_internal_links(notes: str | None) -> list[str]:
    if not notes:
        return []

    found = URL_PATTERN.findall(notes)
    normalized: list[str] = []
    seen: set[str] = set()

    for url in found:
        cleaned = url.rstrip(".,)")
        if cleaned and cleaned not in seen:
            normalized.append(cleaned)
            seen.add(cleaned)

    return normalized


def build_seo_skill_block(task: GenerateDraftRequest, prompt_skill: PromptSkillConfig) -> str:
    if not prompt_skill.enabled or not prompt_skill.instructions.strip():
        return ""

    internal_links = extract_internal_links(task.notes)

    link_instructions = """
- If no internal links are provided in notes, do not invent any links.
""".strip()

    if internal_links:
        formatted_links = "\n".join(f"  - {url}" for url in internal_links)
        link_instructions = f"""
- Use each provided internal URL exactly once.
- Embed each URL naturally inside a sentence.
- Use long-tail anchor text only, ideally around 3 words.
- Do not present links as a list, suggestions, guides, discussions, or topics.
- Because this system stores `content_html`, output the internal links as natural HTML anchor tags inside the article body.
- Provided internal URLs:
{formatted_links}
""".strip()

    return f"""
SEO CONTENT SKILL:
- Use a polished, confident, human-friendly tone.
- Sound natural, conversational, and professional, not robotic or generic.
- Do not use emojis.
- Avoid filler phrases and AI-style wording.
- Rewrite the title to be engaging and SEO-friendly.
- Keep the title between 50 and 60 characters when possible.
- Treat the `title` field as the only H1. Do not place another H1 inside `content_html`.
- Use H2 for main sections and H3 for subsections inside `content_html`.
- Keep paragraphs short, usually 2 to 4 lines.
- Maintain smooth transitions and a logical flow from introduction to conclusion.
- Write a keyword-rich introduction without sounding forced.
- Use keyword-rich, meta-friendly subheadings.
- Expand the article toward 1500 words when the topic supports it.
- Ensure strong on-page SEO structure without keyword stuffing.
- If notes include existing blog content, improve and expand that content instead of replacing the topic.
- If notes include raw URLs, treat them as required internal links to use naturally.
- Map end-of-post deliverables into the structured JSON fields:
  - `slug` = suggested URL slug
  - `meta_description` = 155 to 160 characters when possible
  - `tags` = concise SEO tags as an array of strings
- Do not include the question about creating an illustration image inside `content_html`, because this system creates WordPress drafts from the structured fields.
ACTIVE UI-CONTROLLED SKILL:
- Skill name: {prompt_skill.name}
- Skill description: {prompt_skill.description or "No description provided."}

Skill instructions:
{prompt_skill.instructions}

Dynamic link rules:
{link_instructions}
""".strip()
