from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field, HttpUrl, field_validator


TaskStatus = Literal["queued", "generating", "draft_created", "failed"]


class WordPressSiteConfig(BaseModel):
    label: str = ""
    base_url: HttpUrl
    username: str
    application_password: str
    category_id: int
    default_tags: list[str] = Field(default_factory=list)


class PromptSkillConfig(BaseModel):
    name: str = "Default Skill"
    enabled: bool = True
    description: str = ""
    instructions: str

    @field_validator("name", "description", "instructions")
    @classmethod
    def normalize_text_fields(cls, value: str) -> str:
        return value.strip()


class GenerateDraftRequest(BaseModel):
    task_id: str
    site_key: str
    title_hint: str
    target_keyword: str
    notes: Optional[str] = None

    @field_validator("task_id", "site_key", "title_hint", "target_keyword")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field must not be empty.")
        return cleaned


class GeneratedDraft(BaseModel):
    title: str
    slug: str
    excerpt: str
    content_html: str
    seo_title: str
    meta_description: str
    tags: list[str] = Field(default_factory=list)

    @field_validator("title", "slug", "excerpt", "content_html", "seo_title", "meta_description")
    @classmethod
    def normalize_required_strings(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field must not be empty.")
        return cleaned

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            cleaned = item.strip()
            lowered = cleaned.lower()
            if cleaned and lowered not in seen:
                normalized.append(cleaned)
                seen.add(lowered)
        return normalized


class WordPressDraftResult(BaseModel):
    post_id: int
    link: Union[HttpUrl, str]


class GenerateDraftResponse(BaseModel):
    task_id: str
    status: TaskStatus
    generated_title: str = ""
    artifact_path: Optional[str] = None
    wp_post_id: Optional[int] = None
    wp_link: Optional[str] = None
    error_message: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["ok", "misconfigured"]
    model: str
    wordpress_sites: list[str]
    checked_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
