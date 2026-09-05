import type { z } from 'zod';

/** Maximum diagnostic detail retained from an untrusted schema issue. */
const SCHEMA_ISSUE_DETAIL_LIMIT = 240;

/**
 * Render one bounded structural-schema diagnostic.
 *
 * @param issue First Zod issue reported for the untrusted artifact.
 * @returns Bounded path and message suitable for a validation problem.
 */
export function renderSchemaIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
  return `${path}: ${issue.message}`.slice(0, SCHEMA_ISSUE_DETAIL_LIMIT);
}
