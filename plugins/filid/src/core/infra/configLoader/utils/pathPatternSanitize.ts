import { isValidPathPattern } from '../../../../lib/matchesPathPattern.js';

import type { FilidConfig } from '../loaders/configSchemas.js';

/** Drop malformed path globs once, preserving the exact warning path. */
export function sanitizePathPatterns(
  config: FilidConfig,
  addWarning: (message: string, key: readonly (string | number)[]) => void,
): FilidConfig {
  const sanitize = (patterns: string[], key: readonly string[]): string[] =>
    patterns.filter((pattern, index) => {
      if (isValidPathPattern(pattern)) return true;
      addWarning(`invalid glob syntax "${pattern}" (dropped)`, [...key, index]);
      return false;
    });
  const exclude = config.exclude && sanitize(config.exclude, ['exclude']);
  const generatedPaths = config.structure?.generatedPaths &&
    sanitize(config.structure.generatedPaths, ['structure', 'generatedPaths']);
  return {
    ...config,
    ...(exclude ? { exclude } : {}),
    ...(generatedPaths && config.structure
      ? { structure: { ...config.structure, generatedPaths } }
      : {}),
  };
}
