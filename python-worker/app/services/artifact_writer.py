from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import Settings
from app.models import GenerateDraftRequest, GeneratedDraft, WordPressDraftResult


def _escape_frontmatter(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


class MarkdownArtifactWriter:
    def __init__(self, settings: Settings):
        self._output_dir = Path(settings.draft_output_dir)

    def artifact_path_for_task(self, task_id: str) -> Path:
        return self._output_dir / f"{task_id}.md"

    async def write_success(
        self,
        task: GenerateDraftRequest,
        draft: GeneratedDraft,
        wp_result: Optional[WordPressDraftResult] = None,
    ) -> str:
        artifact_path = self.artifact_path_for_task(task.task_id)
        artifact_path.parent.mkdir(parents=True, exist_ok=True)

        tags = ", ".join(draft.tags) if draft.tags else ""
        now = datetime.now(timezone.utc).isoformat()
        wp_post_id = str(wp_result.post_id) if wp_result is not None else ""
        wp_link = str(wp_result.link) if wp_result is not None else ""

        content = f"""---
task_id: "{_escape_frontmatter(task.task_id)}"
site_key: "{_escape_frontmatter(task.site_key)}"
title_hint: "{_escape_frontmatter(task.title_hint)}"
target_keyword: "{_escape_frontmatter(task.target_keyword)}"
status: "{'draft_created' if wp_result is not None else 'generated'}"
generated_title: "{_escape_frontmatter(draft.title)}"
slug: "{_escape_frontmatter(draft.slug)}"
seo_title: "{_escape_frontmatter(draft.seo_title)}"
meta_description: "{_escape_frontmatter(draft.meta_description)}"
tags: "{_escape_frontmatter(tags)}"
wp_post_id: "{_escape_frontmatter(wp_post_id)}"
wp_link: "{_escape_frontmatter(wp_link)}"
saved_at: "{now}"
---

# {draft.title}

## Task

- Site key: `{task.site_key}`
- Task ID: `{task.task_id}`
- Target keyword: `{task.target_keyword}`

## Excerpt

{draft.excerpt}

## Content HTML

```html
{draft.content_html}
```
"""
        artifact_path.write_text(content, encoding="utf-8")
        return str(artifact_path)

    async def write_failure(
        self,
        task: GenerateDraftRequest,
        error_message: str,
        draft: Optional[GeneratedDraft] = None,
    ) -> str:
        artifact_path = self.artifact_path_for_task(task.task_id)
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        now = datetime.now(timezone.utc).isoformat()

        optional_draft = ""
        if draft is not None:
            optional_draft = f"""
## Partial Draft Snapshot

- Title: {draft.title}
- Slug: `{draft.slug}`
- Excerpt: {draft.excerpt}
"""

        content = f"""---
task_id: "{_escape_frontmatter(task.task_id)}"
site_key: "{_escape_frontmatter(task.site_key)}"
title_hint: "{_escape_frontmatter(task.title_hint)}"
target_keyword: "{_escape_frontmatter(task.target_keyword)}"
status: "failed"
saved_at: "{now}"
---

# Draft Generation Failed

- Task ID: `{task.task_id}`
- Site key: `{task.site_key}`
- Target keyword: `{task.target_keyword}`

## Error

{error_message}
{optional_draft}
"""
        artifact_path.write_text(content, encoding="utf-8")
        return str(artifact_path)
