import { readFileSync } from 'node:fs';

import { writeFileAtomicallySync } from '@ogham/cross-platform';

import { renderReviewPolicyMetadata } from '../../brief/utils/renderReviewPolicyMetadata.js';
import type { ReviewStateRecord } from '../../state/reviewStateTypes.js';

/** Frontmatter keys replaced together without touching caller context or checklist. */
const POLICY_LINE =
  /^(?:effort_mode|effort_reason|auto_low_effort_group_threshold|reviewable_groups|max_reviewer_handoffs):[^\r\n]*(?:\r?\n|$)/gm;

/**
 * Persist selection metadata without rewriting a complete session's review content.
 * @param sessionPath Containment-checked canonical session path from prepare.
 * @param state Same-effective-effort state whose group artifacts remain valid.
 * @throws When the prepared session cannot be read or has no frontmatter.
 */
export function writeReviewSessionPolicy(
  sessionPath: string,
  state: ReviewStateRecord,
): void {
  const session = readFileSync(sessionPath, 'utf8');
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(session);
  if (!match) throw new Error('Prepared review session has no frontmatter.');
  const metadata = renderReviewPolicyMetadata(state, state.groups).join('\n');
  const header = match[2]!.replace(POLICY_LINE, '').replace(/\r?\n$/, '');
  writeFileAtomicallySync(
    sessionPath,
    `${match[1]}${header}\n${metadata}${match[3]}${session.slice(match[0].length)}`,
  );
}
