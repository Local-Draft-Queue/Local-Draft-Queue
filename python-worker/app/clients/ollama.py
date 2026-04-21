from __future__ import annotations

import json
from typing import Optional

import httpx

from app.clients.base import ModelGenerationError
from app.config import Settings
from app.models import GenerateDraftRequest, GeneratedDraft
from app.services.prompt_builder import build_generation_prompt, build_validation_repair_prompt


class OllamaGenerationError(ModelGenerationError):
    pass


def extract_json_object(raw_text: str) -> dict:
    first_brace = raw_text.find("{")
    last_brace = raw_text.rfind("}")
    if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
        raise OllamaGenerationError("Model response did not contain a JSON object.")

    candidate = raw_text[first_brace : last_brace + 1].strip()
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise OllamaGenerationError("Model response contained invalid JSON.") from exc


class OllamaClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    async def _request_generation(self, prompt: str) -> str:
        response = await self._client.post(
            f"{self._settings.ollama_base_url}/api/generate",
            json={
                "model": self._settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                },
            },
        )
        if response.is_error:
            raise OllamaGenerationError(
                f"Ollama request failed with status {response.status_code}: {response.text.strip() or 'No response body.'}"
            )
        payload = response.json()
        raw_text = str(payload.get("response", "")).strip()
        if not raw_text:
            raise OllamaGenerationError("Ollama returned an empty response.")
        return raw_text

    async def generate_draft(self, task: GenerateDraftRequest) -> GeneratedDraft:
        last_error: Optional[Exception] = None

        for stronger_retry in (False, True):
            prompt = build_generation_prompt(
                task,
                self._settings.prompt_skill,
                stronger_retry=stronger_retry,
            )
            try:
                raw_text = await self._request_generation(prompt)
                parsed = extract_json_object(raw_text)
                return GeneratedDraft.model_validate(parsed)
            except (httpx.HTTPError, json.JSONDecodeError, OllamaGenerationError, ValueError) as exc:
                last_error = exc

        raise OllamaGenerationError(f"Failed to obtain valid JSON from Ollama after one retry: {last_error}")

    async def repair_draft(
        self,
        task: GenerateDraftRequest,
        draft: GeneratedDraft,
        validation_errors: list[str],
    ) -> GeneratedDraft:
        prompt = build_validation_repair_prompt(
            task,
            self._settings.prompt_skill,
            draft,
            validation_errors,
        )
        try:
            raw_text = await self._request_generation(prompt)
            parsed = extract_json_object(raw_text)
            return GeneratedDraft.model_validate(parsed)
        except (httpx.HTTPError, json.JSONDecodeError, OllamaGenerationError, ValueError) as exc:
            raise OllamaGenerationError(f"Failed to repair invalid draft: {exc}") from exc
