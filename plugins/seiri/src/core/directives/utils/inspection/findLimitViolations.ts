import { DIRECTIVE_DOCUMENT_LIMITS } from '../../../../constants/directives.js';
import type { DirectiveViolation } from '../../../../types/directives.js';

const LIMITS: Readonly<Record<string, number>> = DIRECTIVE_DOCUMENT_LIMITS;

/**
 * Find limited documents that exceed their byte limit.
 * @param files Set files with their sizes on disk.
 * @returns One violation per document over its limit, in name order.
 */
export function findLimitViolations(
  files: { name: string; bytes: number }[],
): DirectiveViolation[] {
  return files
    .flatMap(({ name, bytes }) => {
      const limit = Object.hasOwn(LIMITS, name) ? LIMITS[name] : undefined;
      return limit !== undefined && bytes > limit
        ? [
            {
              file: name,
              problem: 'over_limit' as const,
              detail: `${bytes} bytes; limit ${limit}`,
            },
          ]
        : [];
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}
