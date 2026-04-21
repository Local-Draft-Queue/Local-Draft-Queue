from __future__ import annotations

from typing import Union

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import SettingsLoadError, get_settings
from app.models import GenerateDraftRequest, GenerateDraftResponse, HealthResponse
from app.services.generation_service import DraftGenerationService


app = FastAPI(title="Draft Generation Worker", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    try:
        settings = get_settings()
        return HealthResponse(
            status="ok",
            model=f"{settings.ai_provider}:{settings.active_model}",
            wordpress_sites=sorted(settings.wp_sites.keys()),
        )
    except SettingsLoadError:
        return HealthResponse(
            status="misconfigured",
            model="unknown",
            wordpress_sites=[],
        )


@app.post("/generate-draft", response_model=GenerateDraftResponse)
async def generate_draft(task: GenerateDraftRequest) -> Union[JSONResponse, GenerateDraftResponse]:
    try:
        settings = get_settings()
    except SettingsLoadError as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    service = DraftGenerationService(settings)
    result = await service.run(task)
    if result.status == "failed":
        return JSONResponse(status_code=422, content=result.model_dump())
    return result
