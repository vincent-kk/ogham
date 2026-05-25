import type { FilidConfig } from './config-schemas.js';

/**
 * Resolve the output language from config.
 * Priority: config.language → 'en' (default).
 * The `setup` skill seeds `config.language` at init time by passing the
 * session's response language to `project_init`.
 */
export function resolveLanguage(config: FilidConfig | null): string {
  return config?.language ?? 'en';
}
