import {
  loadConfig,
  resolveLanguage,
} from '../../../core/infra/config-loader/config-loader.js';

/** Resolve [filid:lang] tag for injection into agent context. */
export function buildLangTag(cwd: string): string {
  try {
    const config = loadConfig(cwd);
    return `[filid:lang] ${resolveLanguage(config)}`;
  } catch {
    return '[filid:lang] en';
  }
}
