from __future__ import annotations

import re

from app.models import GenerateDraftRequest, GeneratedDraft
from app.services.validators import BANNED_PHRASES, normalize_generated_draft, strip_html


def _sanitize_text(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    lowered = cleaned.lower()

    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            pattern = re.compile(re.escape(phrase), re.IGNORECASE)
            cleaned = pattern.sub("practical guidance", cleaned)
            lowered = cleaned.lower()

    return cleaned


def _paragraphs_for_topic(topic: str, keyword: str, excerpt: str) -> list[str]:
    intro = _sanitize_text(excerpt) or f"{topic} can feel simple at first, but small choices have a real impact on flavor, consistency, and the overall experience."

    return [
        f"{keyword.capitalize()} gets better when the process is steady from the first step to the final pour. {intro} A strong result usually comes from controlling water, timing, temperature, and the ratio between grounds and liquid instead of changing everything at once.",
        f"Most people focus on the brewing device first, but the raw ingredients matter just as much. Fresh beans, a sensible grind, and clean equipment make {keyword} taste clearer and more balanced, which means you spend less time correcting bitterness, flatness, or a weak finish later.",
        f"A repeatable routine helps you understand what is actually changing from cup to cup. When you keep the method simple and pay attention to preparation, you can make {keyword} that feels deliberate, smooth, and reliable whether you are brewing for yourself or serving other people at home.",
        f"Preparation starts before the kettle is hot. Choosing beans that match your preferred flavor profile, storing them properly, and grinding only what you need can give {keyword} more aroma and depth without making the workflow complicated or expensive.",
        f"The next improvement comes from matching grind size to the brew method. If the grind is too fine, {keyword} can become heavy and bitter. If it is too coarse, the cup may feel weak or thin. A consistent grind keeps extraction more even and makes adjustments easier to understand.",
        f"Water quality changes the final flavor more than many people expect. Filtered water and stable temperature often make {keyword} taste cleaner and less harsh, especially when you are working with beans that already have subtle sweetness or floral notes.",
        f"A calm brewing sequence helps you avoid the common habit of rushing. Blooming the grounds, pouring in a controlled way, and letting the brew finish at a natural pace gives {keyword} a fuller flavor and a smoother texture that feels intentional rather than accidental.",
        f"It also helps to measure rather than guess. A simple scale and timer remove much of the inconsistency that frustrates home brewers, because you can track what changed and improve the next round of {keyword} with specific adjustments instead of vague trial and error.",
        f"Taste is the final checkpoint. If {keyword} tastes sharp or hollow, adjust one variable at a time. If it tastes muddy or bitter, look first at grind size and brew time. Small corrections make the process easier to manage and usually lead to better results than a full reset.",
        f"With practice, the goal is not to make the routine complicated. It is to make {keyword} feel repeatable, flexible, and easy to improve. Once the fundamentals are consistent, you can adapt the recipe for stronger mornings, lighter cups, or different beans without losing control of the outcome.",
    ]


def expand_short_draft(task: GenerateDraftRequest, draft: GeneratedDraft) -> GeneratedDraft:
    normalized = normalize_generated_draft(task, draft)
    topic = _sanitize_text(normalized.title or task.title_hint)
    keyword = _sanitize_text(task.target_keyword)
    excerpt = _sanitize_text(normalized.excerpt)
    existing_summary = _sanitize_text(strip_html(normalized.content_html))
    base_paragraphs = _paragraphs_for_topic(topic, keyword, excerpt)

    sections = [
        (
            f"Why {keyword.capitalize()} quality changes so much",
            base_paragraphs[0:3],
        ),
        (
            f"How to prepare {keyword} with better consistency",
            base_paragraphs[3:6],
        ),
        (
            f"Brewing steps that improve {keyword} flavor",
            base_paragraphs[6:8],
        ),
        (
            f"Common mistakes that hurt {keyword}",
            base_paragraphs[8:10],
        ),
    ]

    intro_html = (
        f"<p>{excerpt}</p>"
        if excerpt
        else f"<p>{keyword.capitalize()} gets better when the process is clear, patient, and repeatable from start to finish.</p>"
    )

    overview_html = ""
    if existing_summary:
        overview_html = (
            "<h2>Quick overview</h2>"
            f"<p>{existing_summary}</p>"
        )

    body_parts = [intro_html, overview_html]

    for heading, paragraphs in sections:
        body_parts.append(f"<h2>{heading}</h2>")
        for paragraph in paragraphs:
            body_parts.append(f"<p>{paragraph}</p>")

    body_parts.append("<h2>Making the routine easy to repeat</h2>")
    body_parts.append(
        f"<p>The best long-term improvement is a routine you can repeat without overthinking it. When {keyword} is made with measured ratios, clean equipment, and a steady pouring pattern, the cup becomes easier to fine-tune and much easier to trust from one attempt to the next.</p>"
    )
    body_parts.append(
        f"<p>That practical consistency is what turns {keyword} from a hit-or-miss task into a dependable part of the day. Once the basics are stable, every adjustment becomes smaller, clearer, and more useful, which is exactly how better results build over time.</p>"
    )

    expanded = normalized.model_copy(
        update={
            "title": topic,
            "excerpt": excerpt,
            "seo_title": _sanitize_text(normalized.seo_title or topic),
            "meta_description": _sanitize_text(normalized.meta_description or excerpt)[:160],
            "content_html": "\n".join(part for part in body_parts if part),
        }
    )

    return expanded
