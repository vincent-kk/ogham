import { readHookConfig } from '../../utils/readHookConfig.js';

export function buildLangTag(cwd: string): string {
  return `[filid:lang] ${readHookConfig(cwd)?.language ?? 'en'}`;
}
