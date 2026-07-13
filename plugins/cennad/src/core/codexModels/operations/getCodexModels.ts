import { readFile } from 'node:fs/promises';

import { CODEX_FALLBACK_MODEL_EFFORT_SETS } from '../../../constants/codexModels.js';
import { CODEX_MODELS_CACHE_PATH } from '../../../constants/paths.js';
import {
  type CodexModel,
  type CodexModelsCache,
  CodexModelsCacheSchema,
} from '../../../types/index.js';

import { refreshCodexModels } from './refreshCodexModels.js';

const TTL_MS = 60 * 60 * 1000; // 1 hour

// Returns the codex models available to this account with the effort levels each
// one advertises. Serves a fresh cache within TTL, otherwise re-runs `codex debug
// models`; on refresh failure falls back to a stale cache, then to the static
// catalog. Never throws — the settings UI must render without a live codex.
export async function getCodexModels(): Promise<CodexModel[]> {
  const now = Date.now();
  const cached = await readCache();
  if (cached && now - cached.fetched_at < TTL_MS) return cached.models;

  const fresh = await refreshCodexModels(now);
  if (fresh.length > 0) return fresh;
  if (cached && cached.models.length > 0) return cached.models;
  return fallbackModels();
}

async function readCache(): Promise<CodexModelsCache | null> {
  try {
    const text = await readFile(CODEX_MODELS_CACHE_PATH, 'utf8');
    const parsed = CodexModelsCacheSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function fallbackModels(): CodexModel[] {
  return Object.entries(CODEX_FALLBACK_MODEL_EFFORT_SETS).map(
    ([slug, efforts]) => ({ slug, efforts: [...efforts] }),
  );
}
