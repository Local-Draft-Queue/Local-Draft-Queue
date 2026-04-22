from __future__ import annotations

import json
from typing import Any, Optional

import httpx

from app.clients.base import ModelGenerationError
from app.clients.ollama import extract_json_object
from app.config import Settings
from app.models import GenerateDraftRequest, GeneratedDraft
from app.services.prompt_builder import (
    build_generation_system_prompt,
    build_generation_user_prompt,
    build_validation_repair_system_prompt,
    build_validation_repair_user_prompt,
)


class OpenAIGenerationError(ModelGenerationError):
    pass


def _extract_message_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise OpenAIGenerationError("OpenAI response did not include any choices.")

    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise OpenAIGenerationError("OpenAI response did not include a message payload.")

    content = message.get("content")
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text" and isinstance(item.get("text"), str):
                parts.append(item["text"])
        joined = "\n".join(part.strip() for part in parts if part.strip())
        if joined:
            return joined

    raise OpenAIGenerationError("OpenAI response did not include text content.")


class OpenAIClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    async def _request_generation(self, prompt: str, system_prompt: str) -> str:
        response = await self._client.post(
            f"{self._settings.openai_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self._settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self._settings.openai_model,
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
        )

        if response.is_error:
            raise OpenAIGenerationError(
                f"OpenAI request failed with status {response.status_code}: {response.text.strip() or 'No response body.'}"
            )

        try:
            payload = response.json()
        except json.JSONDecodeError as exc:
            raise OpenAIGenerationError("OpenAI returned invalid JSON.") from exc

        raw_text = _extract_message_content(payload)
        if not raw_text:
            raise OpenAIGenerationError("OpenAI returned an empty response.")
        return raw_text

    async def generate_draft(self, task: GenerateDraftRequest) -> GeneratedDraft:
        last_error: Optional[Exception] = None

        for stronger_retry in (False, True):
            system_prompt = build_generation_system_prompt(
                task,
                self._settings.prompt_skill,
                stronger_retry=stronger_retry,
            )
            prompt = build_generation_user_prompt(task)
            try:
                raw_text = await self._request_generation(prompt, system_prompt)
                parsed = extract_json_object(raw_text)
                return GeneratedDraft.model_validate(parsed)
            except (httpx.HTTPError, json.JSONDecodeError, OpenAIGenerationError, ValueError) as exc:
                last_error = exc

        raise OpenAIGenerationError(f"Failed to obtain valid JSON from OpenAI after one retry: {last_error}")

    async def repair_draft(
        self,
        task: GenerateDraftRequest,
        draft: GeneratedDraft,
        validation_errors: list[str],
    ) -> GeneratedDraft:
        system_prompt = build_validation_repair_system_prompt(
            task,
            self._settings.prompt_skill,
            validation_errors,
        )
        prompt = build_validation_repair_user_prompt(task, draft)
        try:
            raw_text = await self._request_generation(prompt, system_prompt)
            parsed = extract_json_object(raw_text)
            return GeneratedDraft.model_validate(parsed)
        except (httpx.HTTPError, json.JSONDecodeError, OpenAIGenerationError, ValueError) as exc:
            raise OpenAIGenerationError(f"Failed to repair invalid draft: {exc}") from exc
