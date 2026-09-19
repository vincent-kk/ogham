import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ensureDirectorySync,
  portableJoin,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_ENTRY_STAGES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../constants/reviewState.js';
import {
  type EntryStageEvidence,
  resolveEntryStage,
} from '../../../mcp/tools/reviewState/assess/resolveEntryStage.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import { runReviewStateFixtureGit } from '../../unit/mcp/reviewState/helpers/runReviewStateFixtureGit.js';

/** Canonical instruction root exercised by the skill loader. */
const skillsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../skills',
);
/** Pipeline reference whose §1 table documents the assess entry priority. */
const pipelineReference = readFileSync(
  join(skillsRoot, 'pipeline/reference.md'),
  'utf8',
);
/** Pipeline skill whose Step 2 table maps every entry stage to an action. */
const pipelineSkill = readFileSync(
  join(skillsRoot, 'pipeline/SKILL.md'),
  'utf8',
);

/**
 * Parse reference.md §1's priority table into `[priority, probe, stage]` rows.
 * @param markdown Pipeline reference text.
 * @returns Rows in document order.
 */
function parseEntryStageTable(markdown: string): [number, string, string][] {
  const section = markdown.split('## §1 Entry-point detection')[1] ?? '';
  return [
    ...section.matchAll(/^\| (\d+)\s+\| (.+?)\s+\| `([a-z-]+)`\s+\|$/gmu),
  ].map(([, priority, probe, stage]) => [Number(priority), probe, stage]);
}

/**
 * Build assess evidence from the four probe flags in priority order.
 * @param flags re-validate report, justifications, fix requests, pull request.
 * @returns Evidence object for `resolveEntryStage`.
 */
function evidenceOf(
  flags: readonly [boolean, boolean, boolean, boolean],
): EntryStageEvidence {
  const [hasReValidate, hasJustifications, hasFixRequests, hasPullRequest] =
    flags;
  return { hasReValidate, hasJustifications, hasFixRequests, hasPullRequest };
}

describe('pipeline entry-stage document contract', () => {
  it('reference.md §1 table equals the stated priority rows and covers every code stage', () => {
    expect(parseEntryStageTable(pipelineReference)).toEqual([
      [1, 'Current-HEAD report has a valid verdict', 'complete'],
      [2, '`REVIEW_DIR/justifications.md` exists', 'revalidate'],
      [3, '`REVIEW_DIR/fix-requests.md` exists', 'resolve'],
      [4, '`hasPullRequest` was passed as true', 'review'],
      [5, 'none of the above', 'pr-create'],
    ]);
    expect(Object.values(REVIEW_ENTRY_STAGES).sort()).toEqual(
      ['complete', 'pr-create', 'resolve', 'review', 'revalidate'].sort(),
    );
  });

  it.each([
    // Each row's evidence makes that row and every lower-priority row match.
    [1, 'complete', [true, true, true, true]],
    [2, 'revalidate', [false, true, true, true]],
    [3, 'resolve', [false, false, true, true]],
    [4, 'review', [false, false, false, true]],
    [5, 'pr-create', [false, false, false, false]],
  ] as const)(
    'resolveEntryStage returns priority %i stage %s when it is the first match',
    (_priority, stage, flags) => {
      expect(resolveEntryStage(evidenceOf(flags))).toBe(stage);
    },
  );

  it.each(['complete', 'revalidate', 'resolve', 'review', 'pr-create'])(
    'SKILL.md Step 2 assigns an action to %s',
    (stage) => {
      const step = pipelineSkill
        .split('## Step 2 — Determine the entry point')[1]!
        .split('## Step 3')[0]!;
      const rows = step.split('\n').filter((line) => line.startsWith('| `'));
      expect(rows.filter((line) => line.includes(`\`${stage}\``))).toHaveLength(
        1,
      );
    },
  );
});

/** Temporary repository whose review directory is seeded per row. */
let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-entry-stage-'));
  runReviewStateFixtureGit(projectRoot, ['init', '--initial-branch=main']);
  runReviewStateFixtureGit(projectRoot, [
    '-c',
    'user.name=Filid Test',
    '-c',
    'user.email=filid-test@example.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--allow-empty',
    '-m',
    'initial',
  ]);
});
afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

describe('assess handler entry stage per documented row', () => {
  it.each([
    // Each row's evidence makes that row and every lower-priority row match.
    [1, 'complete', [true, true, true, true]],
    [2, 'revalidate', [false, true, true, true]],
    [3, 'resolve', [false, false, true, true]],
    [4, 'review', [false, false, false, true]],
    [5, 'pr-create', [false, false, false, false]],
  ] as const)(
    'assess returns priority %i stage %s when it is the first match',
    async (_priority, stage, flags) => {
      const evidence = evidenceOf(flags);
      const paths = resolveReviewStatePaths(projectRoot, 'main');
      ensureDirectorySync(paths.reviewDirectory);
      const head = runReviewStateFixtureGit(projectRoot, ['rev-parse', 'HEAD']);
      if (evidence.hasReValidate)
        writeFileAtomicallySync(
          portableJoin(
            paths.reviewDirectory,
            REVIEW_STATE_FILE_NAMES.RE_VALIDATE,
          ),
          `---\nhead_sha: ${head}\nverdict: PASS\n---\n`,
        );
      if (evidence.hasJustifications)
        writeFileAtomicallySync(
          portableJoin(
            paths.reviewDirectory,
            REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
          ),
          '# Justifications\n',
        );
      if (evidence.hasFixRequests)
        writeFileAtomicallySync(paths.fixRequestsPath, '# Fix requests\n');
      const result = await handleReviewState({
        action: 'assess',
        projectRoot,
        branchName: 'main',
        baseRef: 'main',
        hasPullRequest: evidence.hasPullRequest,
      });
      expect(result.summary.entryStage).toBe(stage);
    },
  );
});
