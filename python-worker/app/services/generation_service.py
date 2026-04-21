from __future__ import annotations

from typing import Optional

from app.clients.base import DraftModelClient, ModelGenerationError
from app.clients.ollama import OllamaClient
from app.clients.openai import OpenAIClient
from app.clients.wordpress import WordPressClient
from app.config import Settings
from app.models import GenerateDraftRequest, GenerateDraftResponse, GeneratedDraft
from app.services.artifact_writer import MarkdownArtifactWriter
from app.services.draft_expander import expand_short_draft
from app.services.validators import DraftValidationError, validate_generated_draft


class DraftGenerationService:
    def __init__(self, settings: Settings):
        self._settings = settings

    def _build_model_client(self) -> DraftModelClient:
        if self._settings.ai_provider == "openai":
            return OpenAIClient(self._settings)
        return OllamaClient(self._settings)

    async def _generate_validated_draft(
        self,
        client: DraftModelClient,
        task: GenerateDraftRequest,
    ) -> tuple[GeneratedDraft, GeneratedDraft]:
        generated = await client.generate_draft(task)
        generated_snapshot = generated

        try:
            validated = validate_generated_draft(task, generated)
        except DraftValidationError as exc:
            repaired = await client.repair_draft(task, generated, exc.errors)
            generated_snapshot = repaired

            try:
                validated = validate_generated_draft(task, repaired)
            except DraftValidationError:
                expanded = expand_short_draft(task, repaired)
                generated_snapshot = expanded

                try:
                    validated = validate_generated_draft(task, expanded)
                except DraftValidationError as final_exc:
                    raise ModelGenerationError(
                        f"Generated draft did not pass validation: {'; '.join(final_exc.errors)}"
                    ) from final_exc

        return validated, generated_snapshot

    async def run(self, task: GenerateDraftRequest) -> GenerateDraftResponse:
        model_client: Optional[DraftModelClient] = None
        wordpress: Optional[WordPressClient] = None
        draft_writer = MarkdownArtifactWriter(self._settings)
        generated_snapshot: Optional[GeneratedDraft] = None
        artifact_path: Optional[str] = None

        try:
            model_client = self._build_model_client()
            wordpress = WordPressClient(self._settings)
            validated, generated_snapshot = await self._generate_validated_draft(model_client, task)

            generated_snapshot = validated
            artifact_path = await draft_writer.write_success(task, validated)
            wp_result = await wordpress.create_draft(task.site_key, validated)
            artifact_path = await draft_writer.write_success(task, validated, wp_result)

            return GenerateDraftResponse(
                task_id=task.task_id,
                status="draft_created",
                generated_title=validated.title,
                artifact_path=artifact_path,
                wp_post_id=wp_result.post_id,
                wp_link=str(wp_result.link),
            )
        except Exception as exc:
            artifact_path = await draft_writer.write_failure(task, str(exc), generated_snapshot)
            return GenerateDraftResponse(
                task_id=task.task_id,
                status="failed",
                artifact_path=artifact_path,
                error_message=str(exc),
            )
        finally:
            if model_client is not None:
                await model_client.close()
            if wordpress is not None:
                await wordpress.close()
