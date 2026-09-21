import { createHash } from 'node:crypto';

import { FACTS_HASH_PREFIX } from '../../../../constants/facts.js';
import { containsPathToken } from '../../../analysis/dependencyGraph/index.js';

/**
 * Digest the lines a reference occurs on, by the path-token rule.
 *
 * This is what a judgement is bound to. Binding to the file's whole content
 * would expire every judgement on any unrelated edit, and an agent asked to
 * re-decide the same item after each commit learns to dismiss reflexively.
 * Binding to these lines expires a judgement exactly when the text that was
 * judged changed.
 *
 * The token rule, not bare substring matching: in a language whose specifiers
 * are bare identifiers a substring match hits every use site, so the digest
 * would change whenever any of them moved.
 *
 * @param contents - The file's current bytes.
 * @param reference - `sourceText ?? specifier` as the record spells it.
 * @returns `sha256:<hex>` over the matching lines, framed by length so two
 * different line sets cannot collide; a reference on no line digests the empty
 * set rather than failing.
 */
export function computeLineDigest(contents: Buffer, reference: string): string {
  const digest = createHash('sha256');
  const matching = contents
    .toString('utf8')
    .split(/\r\n|\r|\n/)
    .filter((line) => containsPathToken(line, reference));
  digest.update(`${matching.length}\0`);
  for (const line of matching)
    digest.update(`${Buffer.byteLength(line, 'utf8')}\0`).update(line, 'utf8');
  return `${FACTS_HASH_PREFIX}${digest.digest('hex')}`;
}
