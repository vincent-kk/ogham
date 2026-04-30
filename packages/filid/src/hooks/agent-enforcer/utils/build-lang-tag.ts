import { readHookConfig } from '../../utils/read-hook-config.js';

export function buildLangTag(cwd: string): string {
  return `[filid:lang] ${readHookConfig(cwd)?.language ?? 'en'}`;
}
