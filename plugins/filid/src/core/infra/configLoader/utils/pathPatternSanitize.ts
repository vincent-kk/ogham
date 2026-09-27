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
  const ignore = config.ignore && sanitize(config.ignore, ['ignore']);
  const excludeFromScan =
    config.structure?.excludeFromScan &&
    sanitize(config.structure.excludeFromScan, ['structure', 'excludeFromScan']);
  const generatedPaths =
    config.review?.generatedPaths &&
    sanitize(config.review.generatedPaths, ['review', 'generatedPaths']);
  return {
    ...config,
    ...(ignore ? { ignore } : {}),
    ...(excludeFromScan && config.structure
      ? { structure: { ...config.structure, excludeFromScan } }
      : {}),
    ...(generatedPaths && config.review
      ? { review: { ...config.review, generatedPaths } }
      : {}),
  };
}
