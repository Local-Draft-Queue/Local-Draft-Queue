from __future__ import annotations

from base64 import b64encode

import httpx

from app.config import Settings
from app.models import GeneratedDraft, WordPressDraftResult, WordPressSiteConfig
from app.services.validators import slugify


class WordPressError(RuntimeError):
    pass


class WordPressClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    @staticmethod
    def _raise_for_status(response: httpx.Response, context: str) -> None:
        if response.is_error:
            raise WordPressError(
                f"{context} failed with status {response.status_code}: {response.text.strip() or 'No response body.'}"
            )

    def _site_config(self, site_key: str) -> WordPressSiteConfig:
        site = self._settings.wp_sites.get(site_key)
        if not site:
            raise WordPressError(f"No WordPress config found for site_key '{site_key}'.")
        return site

    def _headers(self, site: WordPressSiteConfig) -> dict[str, str]:
        token = b64encode(f"{site.username}:{site.application_password}".encode("utf-8")).decode("utf-8")
        return {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }

    async def _get_or_create_tag(self, site: WordPressSiteConfig, tag_name: str) -> int:
        slug = slugify(tag_name)
        headers = self._headers(site)
        base = f"{str(site.base_url).rstrip('/')}/wp-json/wp/v2/tags"

        lookup = await self._client.get(base, headers=headers, params={"slug": slug})
        self._raise_for_status(lookup, "WordPress tag lookup")
        matches = lookup.json()
        if matches:
            return int(matches[0]["id"])

        created = await self._client.post(base, headers=headers, json={"name": tag_name, "slug": slug})
        self._raise_for_status(created, "WordPress tag creation")
        payload = created.json()
        return int(payload["id"])

    async def create_draft(self, site_key: str, draft: GeneratedDraft) -> WordPressDraftResult:
        site = self._site_config(site_key)
        headers = self._headers(site)
        base = f"{str(site.base_url).rstrip('/')}/wp-json/wp/v2"

        tag_names = list(dict.fromkeys([*site.default_tags, *draft.tags]))
        tag_ids: list[int] = []
        for tag_name in tag_names:
            tag_ids.append(await self._get_or_create_tag(site, tag_name))

        response = await self._client.post(
            f"{base}/posts",
            headers=headers,
            json={
                "status": "draft",
                "title": draft.title,
                "content": draft.content_html,
                "excerpt": draft.excerpt,
                "slug": draft.slug,
                "tags": tag_ids,
                "categories": [site.category_id],
            },
        )
        self._raise_for_status(response, "WordPress draft creation")
        payload = response.json()

        return WordPressDraftResult(
            post_id=int(payload["id"]),
            link=str(payload.get("link") or payload.get("guid", {}).get("rendered") or ""),
        )
