import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ResolutionAlias } from '../../../types/adapters.js';

/**
 * Read filid's project-only substitution list without pulling schemas into the bundle.
 * @param projectRoot Root containing filid's own configuration JSON.
 * @returns Validated aliases, or an empty list for absent, unreadable or invalid input.
 */
export function readResolutionAliases(projectRoot: string): ResolutionAlias[] {
  try {
    const config = JSON.parse(
      readFileSync(join(projectRoot, '.filid', 'config.json'), 'utf8'),
    );
    const aliases: unknown = config?.resolution?.aliases;
    if (!Array.isArray(aliases)) return [];
    const result: ResolutionAlias[] = [];
    for (const alias of aliases) {
      if (
        alias === null || typeof alias !== 'object' || Array.isArray(alias) ||
        Object.keys(alias).some((key) => key !== 'from' && key !== 'to') ||
        typeof alias.from !== 'string' || !alias.from ||
        typeof alias.to !== 'string' || !alias.to ||
        !/^[^*]*\*?$/.test(alias.from) || !/^[^*]*\*?$/.test(alias.to) ||
        alias.from.endsWith('*') !== alias.to.endsWith('*') ||
        result.some((previous) => previous.from === alias.from)
      ) return [];
      result.push({ from: alias.from, to: alias.to });
    }
    return result;
  } catch {
    return [];
  }
}
