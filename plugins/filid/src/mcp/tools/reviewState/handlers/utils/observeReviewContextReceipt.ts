import { resolveContainedPath } from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';
import { readHeadTreeEntries } from '../../hash/readHeadTreeEntries.js';
import type { ReviewContextReceipt } from '../../state/reviewIncrementalTypes.js';

/** Credential and review-state paths are not actor-readable source context. */
const PROTECTED_CONTEXT_PATH =
  /(?:^|\/)(?:\.git|\.filid|\.mcp\.json|\.npmrc|credentials[^/]*|[^/]*\.(?:key|pem))(?:\/|$)/i;

/**
 * Execute a committed query and fingerprint its entire scope, including no results.
 * @param projectRoot Canonical repository boundary.
 * @param baseCommit Prepared merge base used by base-revision queries.
 * @param query Actor query; stored digest values are ignored and recomputed.
 * @returns Complete query text and a tool-observed receipt; callers paginate text.
 * @throws On traversal, protected paths, symlinks, unsupported reads or Git errors.
 */
export async function observeReviewContextReceipt(
  projectRoot: string,
  baseCommit: string,
  query: Omit<ReviewContextReceipt, 'digest'>,
  includeText = true,
): Promise<{ text: string; receipt: ReviewContextReceipt }> {
  if (
    !['head', 'base'].includes(query.revision) ||
    !query.path ||
    query.path.includes('\\') ||
    query.path.startsWith('/') ||
    query.path
      .split('/')
      .some(
        (part) =>
          part === '..' || part === '' || (part === '.' && query.path !== '.'),
      ) ||
    PROTECTED_CONTEXT_PATH.test(query.path)
  )
    throw new Error('invalid or protected review context path');
  resolveContainedPath(projectRoot, query.path);
  const revision = query.revision === 'base' ? baseCommit : 'HEAD';
  const entries = await readHeadTreeEntries(
    projectRoot,
    [query.path],
    revision,
  );
  const identity = [...entries].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const digest = computeReviewArtifactHash(
    JSON.stringify([
      query.operation,
      query.path,
      query.revision,
      query.query ?? null,
      identity,
    ]),
  );
  const receipt = { ...query, digest };
  if (!includeText) return { receipt, text: '' };
  if (query.operation === 'exists')
    return {
      receipt,
      text: JSON.stringify(entries.has(query.path) || entries.size > 0),
    };
  if (query.operation === 'read') {
    const entry = entries.get(query.path);
    if (!entry || !entry.identity.startsWith('100'))
      return {
        receipt,
        text: 'UNAVAILABLE: no committed regular file at this path.',
      };
    return {
      receipt,
      text: await executeReviewGit(projectRoot, [
        'cat-file',
        'blob',
        entry.objectHash,
      ]),
    };
  }
  if (typeof query.query !== 'string' || !query.query)
    throw new Error('review context search requires literal query text');
  const matches: string[] = [];
  for (const [path, entry] of identity) {
    if (PROTECTED_CONTEXT_PATH.test(path) || !entry.identity.startsWith('100'))
      continue;
    const body = await executeReviewGit(projectRoot, [
      'cat-file',
      'blob',
      entry.objectHash,
    ]);
    body.split('\n').forEach((line, index) => {
      if (line.includes(query.query!))
        matches.push(`${path}:${index + 1}:${line}`);
    });
  }
  return { receipt, text: matches.join('\n') };
}
