from __future__ import annotations

from typing import Protocol

from app.models import GenerateDraftRequest, GeneratedDraft


class ModelGenerationError(RuntimeError):
    pass


class DraftModelClient(Protocol):
    async def close(self) -> None: ...

    async def generate_draft(self, task: GenerateDraftRequest) -> GeneratedDraft: ...

    async def repair_draft(
        self,
        task: GenerateDraftRequest,
        draft: GeneratedDraft,
        validation_errors: list[str],
    ) -> GeneratedDraft: ...
