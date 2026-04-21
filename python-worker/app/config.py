from __future__ import annotations

import json
import os
from pathlib import Path

from pydantic import BaseModel, ValidationError

from app.models import PromptSkillConfig, WordPressSiteConfig


class Settings(BaseModel):
    ollama_base_url: str
    ollama_model: str
    draft_output_dir: str
    wp_sites: dict[str, WordPressSiteConfig]
    prompt_skill: PromptSkillConfig


class SettingsLoadError(RuntimeError):
    pass


DEFAULT_WP_SITES_FILE = Path(__file__).resolve().parents[2] / "config" / "wp-sites.json"
DEFAULT_DRAFT_OUTPUT_DIR = Path(__file__).resolve().parents[2] / "generated-drafts"
DEFAULT_PROMPT_SKILL_FILE = Path(__file__).resolve().parents[2] / "config" / "prompt-skill.json"


def _parse_wp_sites(raw_value: str) -> dict[str, WordPressSiteConfig]:
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise SettingsLoadError("WP_SITES_JSON is not valid JSON.") from exc

    if not isinstance(parsed, dict) or not parsed:
        raise SettingsLoadError("WP_SITES_JSON must be a non-empty object keyed by site_key.")

    normalized: dict[str, WordPressSiteConfig] = {}
    for site_key, site_data in parsed.items():
        if not isinstance(site_key, str):
            raise SettingsLoadError("WP_SITES_JSON keys must be strings.")
        try:
            normalized[site_key] = WordPressSiteConfig.model_validate(site_data)
        except ValidationError as exc:
            raise SettingsLoadError(f"Invalid WordPress config for site '{site_key}'.") from exc
    return normalized


def _load_wp_sites() -> dict[str, WordPressSiteConfig]:
    raw_wp_sites = os.getenv("WP_SITES_JSON", "").strip()
    if raw_wp_sites:
        return _parse_wp_sites(raw_wp_sites)

    raw_file = os.getenv("WP_SITES_FILE", "").strip()
    file_path = Path(raw_file) if raw_file else DEFAULT_WP_SITES_FILE

    if not file_path.exists():
        raise SettingsLoadError(
            "No WordPress sites configured. Set WP_SITES_JSON or create config/wp-sites.json."
        )

    try:
        raw_file_contents = file_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise SettingsLoadError(f"Unable to read WordPress sites file: {file_path}") from exc

    if not raw_file_contents:
        raise SettingsLoadError(f"WordPress sites file is empty: {file_path}")

    return _parse_wp_sites(raw_file_contents)


def _load_prompt_skill() -> PromptSkillConfig:
    raw_file = os.getenv("PROMPT_SKILL_FILE", "").strip()
    file_path = Path(raw_file) if raw_file else DEFAULT_PROMPT_SKILL_FILE

    if not file_path.exists():
        raise SettingsLoadError(
            f"Prompt skill config is missing: {file_path}. Create config/prompt-skill.json or set PROMPT_SKILL_FILE."
        )

    try:
        raw_file_contents = file_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise SettingsLoadError(f"Unable to read prompt skill file: {file_path}") from exc

    if not raw_file_contents:
        raise SettingsLoadError(f"Prompt skill file is empty: {file_path}")

    try:
        parsed = json.loads(raw_file_contents)
    except json.JSONDecodeError as exc:
        raise SettingsLoadError("Prompt skill file is not valid JSON.") from exc

    try:
        return PromptSkillConfig.model_validate(parsed)
    except ValidationError as exc:
        raise SettingsLoadError("Prompt skill config is invalid.") from exc


def get_settings() -> Settings:
    wp_sites = _load_wp_sites()
    prompt_skill = _load_prompt_skill()

    required = {
        "OLLAMA_BASE_URL": os.getenv("OLLAMA_BASE_URL", "").strip(),
        "OLLAMA_MODEL": os.getenv("OLLAMA_MODEL", "").strip(),
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise SettingsLoadError(f"Missing required environment variables: {', '.join(missing)}")

    return Settings(
        ollama_base_url=required["OLLAMA_BASE_URL"].rstrip("/"),
        ollama_model=required["OLLAMA_MODEL"],
        draft_output_dir=os.getenv("DRAFT_OUTPUT_DIR", str(DEFAULT_DRAFT_OUTPUT_DIR)).strip(),
        wp_sites=wp_sites,
        prompt_skill=prompt_skill,
    )
