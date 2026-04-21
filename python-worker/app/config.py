from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.models import PromptSkillConfig, WordPressSiteConfig


class Settings(BaseModel):
    ai_provider: Literal["ollama", "openai"]
    ollama_base_url: str
    ollama_model: str
    openai_api_key: str = ""
    openai_base_url: str
    openai_model: str
    draft_output_dir: str
    wp_sites: dict[str, WordPressSiteConfig]
    prompt_skill: PromptSkillConfig

    @property
    def active_model(self) -> str:
        if self.ai_provider == "openai":
            return self.openai_model
        return self.ollama_model


class SettingsLoadError(RuntimeError):
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RUNTIME_SETTINGS_FILE = PROJECT_ROOT / "config" / "runtime-settings.json"
DEFAULT_WP_SITES_FILE = PROJECT_ROOT / "config" / "wp-sites.json"
DEFAULT_DRAFT_OUTPUT_DIR = PROJECT_ROOT / "generated-drafts"
DEFAULT_PROMPT_SKILL_FILE = PROJECT_ROOT / "config" / "prompt-skill.json"
DEFAULT_WP_SITES_PATH = "config/wp-sites.json"
DEFAULT_DRAFT_OUTPUT_DIR_PATH = "generated-drafts"
DEFAULT_PROMPT_SKILL_FILE_PATH = "config/prompt-skill.json"

LEGACY_PATH_MIGRATIONS = {
    "/config/wp-sites.json": DEFAULT_WP_SITES_PATH,
    "/generated-drafts": DEFAULT_DRAFT_OUTPUT_DIR_PATH,
    "/prompt-skill.json": DEFAULT_PROMPT_SKILL_FILE_PATH,
    "/config/prompt-skill.json": DEFAULT_PROMPT_SKILL_FILE_PATH,
}

def _normalize_stored_path(raw_value: str | None, fallback: str) -> str:
    trimmed = (raw_value or "").strip()
    if not trimmed:
        return fallback

    migrated = LEGACY_PATH_MIGRATIONS.get(trimmed)
    if migrated:
        return migrated

    candidate = Path(trimmed)
    if candidate.is_absolute():
        try:
            relative_path = candidate.relative_to(PROJECT_ROOT)
        except ValueError:
            return str(candidate)
        return relative_path.as_posix()

    return Path(trimmed).as_posix()


def _resolve_project_path(raw_value: str | None, fallback: str) -> Path:
    normalized = _normalize_stored_path(raw_value, fallback)
    candidate = Path(normalized)
    if candidate.is_absolute():
        return candidate
    return PROJECT_ROOT / candidate


def _load_runtime_settings() -> dict:
    raw_file = os.getenv("RUNTIME_SETTINGS_FILE", "").strip()
    file_path = Path(raw_file) if raw_file else DEFAULT_RUNTIME_SETTINGS_FILE

    if not file_path.exists():
        return {}

    try:
        raw_file_contents = file_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise SettingsLoadError(f"Unable to read runtime settings file: {file_path}") from exc

    if not raw_file_contents:
        return {}

    try:
        parsed = json.loads(raw_file_contents)
    except json.JSONDecodeError as exc:
        raise SettingsLoadError("Runtime settings file is not valid JSON.") from exc

    if not isinstance(parsed, dict):
        raise SettingsLoadError("Runtime settings file must contain a JSON object.")

    return parsed


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


def _load_wp_sites(runtime_settings: dict) -> dict[str, WordPressSiteConfig]:
    raw_wp_sites = os.getenv("WP_SITES_JSON", "").strip()
    if raw_wp_sites:
        return _parse_wp_sites(raw_wp_sites)

    raw_file = str(runtime_settings.get("wpSitesFile", "")).strip() or os.getenv("WP_SITES_FILE", "").strip()
    file_path = _resolve_project_path(raw_file, DEFAULT_WP_SITES_PATH)

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


def _load_prompt_skill(runtime_settings: dict) -> PromptSkillConfig:
    raw_file = str(runtime_settings.get("promptSkillFile", "")).strip() or os.getenv("PROMPT_SKILL_FILE", "").strip()
    file_path = _resolve_project_path(raw_file, DEFAULT_PROMPT_SKILL_FILE_PATH)

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
    runtime_settings = _load_runtime_settings()
    wp_sites = _load_wp_sites(runtime_settings)
    prompt_skill = _load_prompt_skill(runtime_settings)

    ai_provider = str(runtime_settings.get("aiProvider", "")).strip() or os.getenv("AI_PROVIDER", "").strip() or "ollama"
    if ai_provider not in {"ollama", "openai"}:
        raise SettingsLoadError("AI provider must be either 'ollama' or 'openai'.")

    ollama_base_url = str(runtime_settings.get("ollamaBaseUrl", "")).strip() or os.getenv("OLLAMA_BASE_URL", "").strip()
    ollama_model = str(runtime_settings.get("ollamaModel", "")).strip() or os.getenv("OLLAMA_MODEL", "").strip()
    openai_api_key = str(runtime_settings.get("openAiApiKey", "")).strip() or os.getenv("OPENAI_API_KEY", "").strip()
    openai_base_url = (
        str(runtime_settings.get("openAiBaseUrl", "")).strip()
        or os.getenv("OPENAI_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    )
    openai_model = (
        str(runtime_settings.get("openAiModel", "")).strip()
        or os.getenv("OPENAI_MODEL", "").strip()
        or "gpt-4o-mini"
    )

    if not ollama_base_url:
        ollama_base_url = "http://localhost:11434"
    if not ollama_model:
        ollama_model = "qwen2.5-coder:1.5b"

    if ai_provider == "openai" and not openai_api_key:
        raise SettingsLoadError("OPENAI_API_KEY is required when the AI provider is set to openai.")

    return Settings(
        ai_provider=ai_provider,
        ollama_base_url=ollama_base_url.rstrip("/"),
        ollama_model=ollama_model,
        openai_api_key=openai_api_key,
        openai_base_url=openai_base_url.rstrip("/"),
        openai_model=openai_model,
        draft_output_dir=str(
            _resolve_project_path(
                str(runtime_settings.get("draftOutputDir", "")).strip()
                or os.getenv("DRAFT_OUTPUT_DIR", "").strip(),
                DEFAULT_DRAFT_OUTPUT_DIR_PATH,
            )
        ),
        wp_sites=wp_sites,
        prompt_skill=prompt_skill,
    )
