import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FACTS_ACTIONS,
  FACTS_ADJUDICATION_ACTOR_CODE,
  FACTS_ADJUDICATION_REFUSALS,
  FACTS_ADJUDICATION_STALE_CODE,
  FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
  FACTS_COMPARISON_NOT_INDEPENDENT_CODE,
  FACTS_DIAGNOSTIC_CODES,
  FACTS_GENERATION_ID_INVALID_CODE,
  FACTS_PENDING_DISCARDED_CODE,
  FACTS_REJECTION_CODES,
  FACTS_SHARD_NOT_DAMAGED_CODE,
  FACTS_UNFROZEN_GENERATION_CODE,
  FACTS_UNKNOWN_CAUSES,
} from '../../constants/facts.js';
import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../constants/reviewState.js';

/** Absolute path of the packaged skills tree. */
const SKILLS_ROOT = fileURLToPath(new URL('../../../skills', import.meta.url));

/** Every code a filid tool can put in a diagnostic, a candidate rule or a cause. */
const REAL_CODES = new Set<string>([
  ...Object.values(FACTS_DIAGNOSTIC_CODES),
  ...Object.values(FACTS_REJECTION_CODES),
  ...Object.values(FACTS_ADJUDICATION_REFUSALS),
  ...Object.values(FACTS_UNKNOWN_CAUSES),
  ...Object.values(REVIEW_STATE_DIAGNOSTIC_CODES),
  FACTS_ADJUDICATION_ACTOR_CODE,
  FACTS_ADJUDICATION_STALE_CODE,
  FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
  FACTS_COMPARISON_NOT_INDEPENDENT_CODE,
  FACTS_GENERATION_ID_INVALID_CODE,
  FACTS_PENDING_DISCARDED_CODE,
  FACTS_SHARD_NOT_DAMAGED_CODE,
  FACTS_UNFROZEN_GENERATION_CODE,
]);

/**
 * Every Markdown document under the skills tree, found rather than listed.
 * @param directory Absolute directory to walk.
 * @returns Skills-relative POSIX paths of the documents it holds.
 */
function documentsUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return documentsUnder(absolute);
    return entry.name.endsWith('.md')
      ? [relative(SKILLS_ROOT, absolute).split(/[\\/]/).join('/')]
      : [];
  });
}

/** Skill documents, sorted so a failure lists offenders in the same order everywhere. */
const DOCUMENTS = documentsUnder(SKILLS_ROOT).sort();

/**
 * Codes one skill document names in a code span.
 * @param relativePath Skills-relative path of the document.
 * @returns Each distinct `facts-*` or `review-*` code it spells.
 */
function namedCodes(relativePath: string): string[] {
  const text = readFileSync(join(SKILLS_ROOT, relativePath), 'utf8');
  return [
    ...new Set(
      [...text.matchAll(/`((?:facts|review)-[a-z-]+)`/g)].map(
        ([, code]) => code,
      ),
    ),
  ];
}

/** Each refusal the transition added, and the document that tells an agent what to do about it. */
const HANDLED_BY = [
  [
    REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE,
    '.shared/facts-bootstrap.md',
  ],
  [REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_DISCREPANCY, 'cross-review/SKILL.md'],
  [
    REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_FROZEN_UNUSABLE,
    'cross-review/SKILL.md',
  ],
  [FACTS_UNKNOWN_CAUSES.TOOL_ERROR, '.shared/facts-bootstrap.md'],
  [FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE, '.shared/facts-bootstrap.md'],
  [FACTS_UNKNOWN_CAUSES.JUDGEMENTS_DISCARDED, '.shared/facts-bootstrap.md'],
  [FACTS_SHARD_NOT_DAMAGED_CODE, '.shared/facts-bootstrap.md'],
  [FACTS_PENDING_DISCARDED_CODE, '.shared/facts-bootstrap.md'],
  [FACTS_COMPARISON_NOT_INDEPENDENT_CODE, '.shared/facts-bootstrap.md'],
  [
    FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
    '.shared/facts-bootstrap.md',
  ],
  // Two documents owe this one an answer: the bootstrap says how to clear the
  // mark, and the verifier — who always compares against a generation — says
  // why clearing it is never its business.
  [
    FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
    'cross-review/reviewers/verifier.md',
  ],
  [
    FACTS_REJECTION_CODES.CONTRACT_GROUP_ABSENT,
    '.shared/facts-bootstrap.md',
  ],
  [
    FACTS_DIAGNOSTIC_CODES.SIDE_TABLE_CHANGED,
    'cross-review/reviewers/verifier.md',
  ],
] as const;

describe('a skill names only diagnostics the server can return', () => {
  it('spells no code across the whole skills tree that no constant defines', () => {
    expect(
      DOCUMENTS.flatMap((relativePath) =>
        namedCodes(relativePath)
          .filter((code) => !REAL_CODES.has(code))
          .map((code) => `${relativePath}: ${code}`),
      ),
    ).toEqual([]);
  });

  it('finds codes to check at all, so the sweep cannot pass on an empty match', () => {
    expect(DOCUMENTS).toContain('.shared/facts-bootstrap.md');
    expect(new Set(DOCUMENTS.flatMap(namedCodes)).size).toBeGreaterThan(
      HANDLED_BY.length,
    );
  });
});

describe('a skill spells every tool call by the name the host resolves', () => {
  it('writes no shorthand call that the argument contract would skip', () => {
    const offenders = DOCUMENTS.flatMap((relativePath) => {
      const text = readFileSync(join(SKILLS_ROOT, relativePath), 'utf8');
      return [...text.matchAll(/`([a-z][a-z-]*)\(\{ action:/g)]
        .filter(([, name]) => !name.startsWith('mcp__'))
        .map(([, name]) => `${relativePath}: ${name}({ action: …`);
    });

    expect(offenders).toEqual([]);
  });

  it('reaches every facts action through a full-name call', () => {
    const spelled = new Set(
      DOCUMENTS.flatMap((relativePath) =>
        [
          ...readFileSync(join(SKILLS_ROOT, relativePath), 'utf8').matchAll(
            /mcp__plugin_filid_tools__facts\(\{\s*action: "([a-z-]+)"/g,
          ),
        ].map(([, action]) => action),
      ),
    );

    expect(
      Object.values(FACTS_ACTIONS).filter((action) => !spelled.has(action)),
    ).toEqual([]);
  });
});

describe('every refusal the transition added is answered by a skill', () => {
  it.each(HANDLED_BY)('%s is answered in %s', (code, relativePath) => {
    expect(readFileSync(join(SKILLS_ROOT, relativePath), 'utf8')).toContain(
      code,
    );
  });
});
