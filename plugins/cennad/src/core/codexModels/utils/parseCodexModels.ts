import {
  type CodexEffort,
  CodexEffortSchema,
  type CodexModel,
} from '../../../types/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toEffort(value: unknown): CodexEffort | null {
  const parsed = CodexEffortSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toModel(entry: unknown): CodexModel | null {
  if (!isRecord(entry)) return null;
  if (typeof entry.slug !== 'string' || entry.slug.trim().length === 0)
    return null;
  // `hide` entries (codex-auto-review) are internal, and a model without API
  // support cannot be driven by `codex exec`.
  if (entry.visibility !== 'list' || entry.supported_in_api === false)
    return null;

  const levels = Array.isArray(entry.supported_reasoning_levels)
    ? entry.supported_reasoning_levels
    : [];
  const efforts = levels
    .map((level) => toEffort(isRecord(level) ? level.effort : level))
    .filter((effort): effort is CodexEffort => effort !== null);
  if (efforts.length === 0) return null;

  const model: CodexModel = { slug: entry.slug, efforts };
  const defaultEffort = toEffort(entry.default_reasoning_level);
  if (defaultEffort) model.default_effort = defaultEffort;
  if (typeof entry.description === 'string')
    model.description = entry.description;
  return model;
}

// Catalog entries arrive ordered by codex's own `priority` (frontier first);
// that order is preserved so the settings UI lists models the way codex does.
export function parseCodexModels(stdout: string): CodexModel[] {
  const text = stdout.trim();
  if (text.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.models)
      ? parsed.models
      : [];

  return entries
    .map(toModel)
    .filter((model): model is CodexModel => model !== null);
}
