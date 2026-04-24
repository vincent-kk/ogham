import type { FilidConfig } from './config-schemas.js';

/**
 * Resolve the output language from config.
 * Priority: config.language → 'en' (default).
 * System-level language detection is handled at the hook/skill layer.
 */
export function resolveLanguage(config: FilidConfig | null): string {
  return config?.language ?? 'en';
}
