import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { getResolvedRuntimeConfig } from "@/lib/runtime-config";
import { createSiteSchema, updateSiteSchema } from "@/lib/schemas";
import type { WordPressSite, WordPressSiteUpdateInput } from "@/types/site";

interface StoredWordPressSite {
  label?: string;
  base_url: string;
  username: string;
  application_password: string;
  category_id: number;
  default_tags?: string[];
}

type SiteStore = Record<string, StoredWordPressSite>;

let writeQueue: Promise<unknown> = Promise.resolve();

async function getSitesFile(): Promise<string> {
  const config = await getResolvedRuntimeConfig();
  return config.wpSitesFile;
}

async function ensureSitesFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readSitesStore(): Promise<SiteStore> {
  const sitesFile = await getSitesFile();
  await ensureSitesFile(sitesFile);
  const raw = await readFile(sitesFile, "utf8");
  const parsed = JSON.parse(raw) as SiteStore;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

async function writeSitesStore(store: SiteStore, filePath: string): Promise<void> {
  const tempFile = `${filePath}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await rename(tempFile, filePath);
}

function queueWrite<T>(work: () => Promise<T>): Promise<T> {
  const nextWrite = writeQueue.then(work, work);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

function toPublicSite(siteKey: string, site: StoredWordPressSite): WordPressSite {
  return {
    siteKey,
    label: site.label?.trim() || siteKey,
    baseUrl: site.base_url,
    username: site.username,
    categoryId: site.category_id,
    defaultTags: site.default_tags ?? [],
  };
}

export async function listSites(): Promise<WordPressSite[]> {
  const store = await readSitesStore();
  return Object.entries(store)
    .map(([siteKey, site]) => toPublicSite(siteKey, site))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function getSiteByKey(siteKey: string): Promise<WordPressSite | null> {
  const store = await readSitesStore();
  const site = store[siteKey];
  return site ? toPublicSite(siteKey, site) : null;
}

export async function saveSite(input: unknown): Promise<WordPressSite> {
  const parsed = createSiteSchema.parse(input);
  const normalizedTags = parsed.defaultTags
    .map((tag) => tag.trim())
    .filter(Boolean);

  return queueWrite(async () => {
    const sitesFile = await getSitesFile();
    const store = await readSitesStore();
    store[parsed.siteKey] = {
      label: parsed.label.trim() || parsed.siteKey,
      base_url: parsed.baseUrl.replace(/\/$/, ""),
      username: parsed.username,
      application_password: parsed.applicationPassword,
      category_id: parsed.categoryId,
      default_tags: Array.from(new Set(normalizedTags)),
    };
    await writeSitesStore(store, sitesFile);
    return toPublicSite(parsed.siteKey, store[parsed.siteKey]);
  });
}

export async function updateSite(siteKey: string, input: unknown): Promise<WordPressSite | null> {
  const parsed = updateSiteSchema.parse(input);
  const normalizedTags = parsed.defaultTags
    .map((tag) => tag.trim())
    .filter(Boolean);

  return queueWrite(async () => {
    const sitesFile = await getSitesFile();
    const store = await readSitesStore();
    const existing = store[siteKey];
    if (!existing) {
      return null;
    }

    store[siteKey] = {
      label: parsed.label.trim() || siteKey,
      base_url: parsed.baseUrl.replace(/\/$/, ""),
      username: parsed.username,
      application_password: parsed.applicationPassword.trim() || existing.application_password,
      category_id: parsed.categoryId,
      default_tags: Array.from(new Set(normalizedTags)),
    };

    await writeSitesStore(store, sitesFile);
    return toPublicSite(siteKey, store[siteKey]);
  });
}

export async function deleteSite(siteKey: string): Promise<boolean> {
  return queueWrite(async () => {
    const sitesFile = await getSitesFile();
    const store = await readSitesStore();
    if (!store[siteKey]) {
      return false;
    }

    delete store[siteKey];
    await writeSitesStore(store, sitesFile);
    return true;
  });
}
