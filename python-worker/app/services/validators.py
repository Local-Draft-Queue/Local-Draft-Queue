from __future__ import annotations

import re
from html import unescape

from app.models import GenerateDraftRequest, GeneratedDraft


BANNED_PHRASES = (
    "in conclusion",
    "ever-evolving",
    "delve into",
    "game changer",
    "at the end of the day",
)


class DraftValidationError(ValueError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def slugify(value: str) -> str:
    lowered = value.lower().strip()
    normalized = re.sub(r"[^a-z0-9]+", "-", lowered)
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-")


def strip_html(value: str) -> str:
    no_tags = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", unescape(no_tags)).strip()


def word_count(value: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", value))


def _unwrap_paragraph_tag(value: str) -> str:
    match = re.match(r"^\s*<p>(.*)</p>\s*$", value, flags=re.IGNORECASE)
    return match.group(1).strip() if match else value.strip()


def _normalize_html_lists(value: str) -> str:
    normalized_lines: list[str] = []
    current_list_type: str | None = None

    def close_list() -> None:
        nonlocal current_list_type
        if current_list_type:
            normalized_lines.append(f"</{current_list_type}>")
            current_list_type = None

    for raw_line in value.replace("\r\n", "\n").split("\n"):
        stripped = raw_line.strip()

        if not stripped:
            close_list()
            if normalized_lines and normalized_lines[-1] != "":
                normalized_lines.append("")
            continue

        item_source = _unwrap_paragraph_tag(stripped)
        unordered_match = re.match(r"^[-*+]\s+(.*)$", item_source)
        ordered_match = re.match(r"^\d+[.)]\s+(.*)$", item_source)

        if unordered_match or ordered_match:
            list_type = "ul" if unordered_match else "ol"
            item_content = (unordered_match or ordered_match).group(1).strip()

            if current_list_type != list_type:
                close_list()
                normalized_lines.append(f"<{list_type}>")
                current_list_type = list_type

            normalized_lines.append(f"<li>{item_content}</li>")
            continue

        close_list()
        normalized_lines.append(stripped)

    close_list()
    return "\n".join(normalized_lines).strip()


def normalize_generated_draft(task: GenerateDraftRequest, draft: GeneratedDraft) -> GeneratedDraft:
    fallback_slug = slugify(draft.slug or draft.title)
    return draft.model_copy(
        update={
            "slug": fallback_slug or slugify(task.target_keyword),
            "title": re.sub(r"\s+", " ", draft.title).strip(),
            "excerpt": re.sub(r"\s+", " ", draft.excerpt).strip(),
            "seo_title": re.sub(r"\s+", " ", draft.seo_title).strip(),
            "meta_description": re.sub(r"\s+", " ", draft.meta_description).strip(),
            "content_html": _normalize_html_lists(draft.content_html),
        }
    )


def validate_generated_draft(task: GenerateDraftRequest, draft: GeneratedDraft) -> GeneratedDraft:
    errors: list[str] = []
    normalized = normalize_generated_draft(task, draft)
    visible_content = strip_html(normalized.content_html)
    combined_text = " ".join(
        [
            normalized.title,
            normalized.excerpt,
            visible_content,
            normalized.seo_title,
            normalized.meta_description,
        ]
    ).lower()
    keyword = task.target_keyword.lower().strip()

    if not normalized.title:
        errors.append("Generated draft is missing title.")
    if not normalized.excerpt:
        errors.append("Generated draft is missing excerpt.")
    if word_count(visible_content) < 700:
        errors.append("Generated content must be at least 700 words.")
    if "<h2" not in normalized.content_html.lower():
        errors.append("Generated content must contain at least one <h2> heading.")
    if keyword not in combined_text:
        errors.append("Target keyword was not included in the generated draft.")

    for phrase in BANNED_PHRASES:
        if phrase in combined_text:
            errors.append(f'Generated draft includes banned phrase "{phrase}".')

    if errors:
        raise DraftValidationError(errors)

    return normalized
