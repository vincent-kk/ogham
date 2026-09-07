import { mkdtempSync, readdirSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableJoin,
  readUtf8FileIfExistsSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_ENTRY_STAGES,
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_FILE_NAMES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStatePaths } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { runReviewStateFixtureGit } from './reviewState/helpers/runReviewStateFixtureGit.js';

/** Temporary repository whose actual HEAD drives the assessment. */
let projectRoot: string;

/** Canonical branch artifact paths resolved by the production boundary. */
let paths: ReviewStatePaths;

/** Revalidation artifact read by the assess handler. */
let reportPath: string;

/** Full commit identity observed after fixture initialization. */
let currentHead: string;

/** Isolated fixture commits avoid host identity and signing configuration. */
const COMMIT_ARGUMENTS = [
  '-c',
  'user.name=Filid Test',
  '-c',
  'user.email=filid-test@example.test',
  '-c',
  'commit.gpgsign=false',
  'commit',
  '--allow-empty',
  '-m',
] as const;

/**
 * Build the canonical head metadata in a recorded revalidation verdict.
 * @param head Full commit identity to record without alteration.
 * @returns Complete report bytes for the freshness checks.
 */
function reportForHead(head: string): string {
  return `---\nhead_sha: ${head}\nverdict: PASS\n---\n\n# FCA Revalidate\n\nPASS\n`;
}

/**
 * Exercise the public action dispatcher against a real fixture repository.
 * @param root Absolute temporary Git root to observe.
 * @param hasPullRequest Caller-owned PR evidence for the fallback stage.
 * @returns The production assess payload without preparing review state.
 */
function assess(root: string, hasPullRequest = false) {
  return handleReviewState({
    action: REVIEW_STATE_ACTIONS.ASSESS,
    projectRoot: root,
    branchName: 'main',
    baseRef: 'main',
    hasPullRequest,
  });
}

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-assess-freshness-'));
  runReviewStateFixtureGit(projectRoot, [
    'init',
    '--initial-branch=main',
    '--object-format=sha1',
  ]);
  runReviewStateFixtureGit(projectRoot, [...COMMIT_ARGUMENTS, 'initial']);
  currentHead = runReviewStateFixtureGit(projectRoot, ['rev-parse', 'HEAD']);
  paths = resolveReviewStatePaths(projectRoot, 'main');
  ensureDirectorySync(paths.reviewDirectory);
  reportPath = portableJoin(
    paths.reviewDirectory,
    REVIEW_STATE_FILE_NAMES.RE_VALIDATE,
  );
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('review_state assess revalidation freshness', () => {
  it('stops reusing the same report after the repository HEAD advances', async () => {
    writeFileAtomicallySync(reportPath, reportForHead(currentHead));
    writeFileAtomicallySync(
      portableJoin(
        paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
      ),
      '# Justifications\n',
    );
    expect((await assess(projectRoot)).summary.entryStage).toBe(
      REVIEW_ENTRY_STAGES.COMPLETE,
    );
    runReviewStateFixtureGit(projectRoot, [...COMMIT_ARGUMENTS, 'advance']);

    const result = await assess(projectRoot);

    expect(result.summary.entryStage).toBe(REVIEW_ENTRY_STAGES.REVALIDATE);
    expect(readUtf8FileIfExistsSync(reportPath)).toBe(
      reportForHead(currentHead),
    );
  });

  it.each([
    {
      report: 'stale',
      justifications: true,
      fixes: true,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.REVALIDATE,
    },
    {
      report: 'stale',
      justifications: false,
      fixes: true,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.RESOLVE,
    },
    {
      report: 'stale',
      justifications: false,
      fixes: false,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.REVIEW,
    },
    {
      report: 'stale',
      justifications: false,
      fixes: false,
      pr: false,
      stage: REVIEW_ENTRY_STAGES.PR_CREATE,
    },
    {
      report: 'missing',
      justifications: true,
      fixes: true,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.REVALIDATE,
    },
    {
      report: 'missing',
      justifications: false,
      fixes: true,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.RESOLVE,
    },
    {
      report: 'missing',
      justifications: false,
      fixes: false,
      pr: true,
      stage: REVIEW_ENTRY_STAGES.REVIEW,
    },
    {
      report: 'missing',
      justifications: false,
      fixes: false,
      pr: false,
      stage: REVIEW_ENTRY_STAGES.PR_CREATE,
    },
  ])(
    'falls back to $stage when the report is $report',
    async ({ report, justifications, fixes, pr, stage }) => {
      if (report === 'stale')
        writeFileAtomicallySync(reportPath, reportForHead('0'.repeat(40)));
      if (justifications)
        writeFileAtomicallySync(
          portableJoin(
            paths.reviewDirectory,
            REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
          ),
          '# Justifications\n',
        );
      if (fixes)
        writeFileAtomicallySync(paths.fixRequestsPath, '# Fix requests\n');

      const result = await assess(projectRoot, pr);

      expect(result.summary.entryStage).toBe(stage);
      expect(result.data?.assessment).toMatchObject({ entryStage: stage });
    },
  );

  it.each([
    {
      name: 'body without frontmatter',
      report: '# Revalidate\nhead_sha: $HEAD\n',
    },
    {
      name: 'head only in the body',
      report: '---\nverdict: PASS\n---\nhead_sha: $HEAD\n',
    },
    {
      name: 'unclosed frontmatter',
      report: '---\nverdict: PASS\nhead_sha: $HEAD\n',
    },
    { name: 'empty head', report: '---\nverdict: PASS\nhead_sha: \n---\n' },
    {
      name: 'non-hex head',
      report: '---\nverdict: PASS\nhead_sha: unresolved\n---\n',
    },
    {
      name: 'abbreviated head',
      report: '---\nverdict: PASS\nhead_sha: $SHORT_HEAD\n---\n',
    },
    {
      name: 'overlong head',
      report: '---\nverdict: PASS\nhead_sha: $HEAD$HEAD\n---\n',
    },
    {
      name: 'conflicting head keys',
      report:
        '---\nverdict: PASS\nhead_sha: $HEAD\nhead_sha: 0000000000000000000000000000000000000000\n---\n',
    },
    {
      name: 'repeated identical head keys',
      report: '---\nverdict: PASS\nhead_sha: $HEAD\nhead_sha: $HEAD\n---\n',
    },
    {
      name: 'duplicate malformed head key',
      report: '---\nverdict: PASS\nhead_sha: $HEAD\nhead_sha:\n---\n',
    },
    {
      name: 'duplicate spaced head key',
      report: '---\nverdict: PASS\nhead_sha: $HEAD\nhead_sha : $HEAD\n---\n',
    },
    {
      name: 'duplicate quoted head key',
      report: '---\nverdict: PASS\nhead_sha: $HEAD\n"head_sha": $HEAD\n---\n',
    },
    {
      name: 'duplicate escaped head key',
      report:
        '---\nverdict: PASS\nhead_sha: $HEAD\n"head_\\x73ha": $HEAD\n---\n',
    },
    {
      name: 'nested head key',
      report: '---\nverdict: PASS\nmetadata:\n  head_sha: $HEAD\n---\n',
    },
    {
      name: 'text before frontmatter',
      report: '# Draft\n---\nverdict: PASS\nhead_sha: $HEAD\n---\n',
    },
  ])('ignores $name as completion evidence', async ({ report }) => {
    writeFileAtomicallySync(
      reportPath,
      report
        .replaceAll('$HEAD', currentHead)
        .replaceAll('$SHORT_HEAD', currentHead.slice(0, 8)),
    );
    writeFileAtomicallySync(
      portableJoin(
        paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
      ),
      '# Justifications\n',
    );

    const result = await assess(projectRoot);

    expect(result.summary.entryStage).toBe(REVIEW_ENTRY_STAGES.REVALIDATE);
  });

  it('matches a full SHA-256 identity in a SHA-256 repository', async () => {
    rmSync(portableJoin(projectRoot, '.git'), { recursive: true, force: true });
    runReviewStateFixtureGit(projectRoot, [
      'init',
      '--initial-branch=main',
      '--object-format=sha256',
    ]);
    runReviewStateFixtureGit(projectRoot, [...COMMIT_ARGUMENTS, 'sha256']);
    const head = runReviewStateFixtureGit(projectRoot, ['rev-parse', 'HEAD']);
    expect(head).toHaveLength(64);
    writeFileAtomicallySync(reportPath, reportForHead(head));

    const result = await assess(projectRoot);

    expect(result.summary.entryStage).toBe(REVIEW_ENTRY_STAGES.COMPLETE);
  });

  it('resumes when the repository has no observable HEAD', async () => {
    writeFileAtomicallySync(reportPath, reportForHead(currentHead));
    writeFileAtomicallySync(
      portableJoin(
        paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
      ),
      '# Justifications\n',
    );
    rmSync(portableJoin(projectRoot, '.git'), { recursive: true, force: true });
    runReviewStateFixtureGit(projectRoot, ['init', '--initial-branch=main']);

    const result = await assess(projectRoot);

    expect(result.summary.entryStage).toBe(REVIEW_ENTRY_STAGES.REVALIDATE);
  });

  it('leaves malformed state and repository contents untouched', async () => {
    writeFileAtomicallySync(reportPath, reportForHead(currentHead));
    writeFileAtomicallySync(paths.statePath, 'not a review state JSON');
    const filesBefore = readdirSync(paths.reviewDirectory).sort();
    const statusBefore = runReviewStateFixtureGit(projectRoot, [
      'status',
      '--porcelain',
      '-z',
    ]);

    const result = await assess(projectRoot);

    expect(result.summary.entryStage).toBe(REVIEW_ENTRY_STAGES.COMPLETE);
    expect(readUtf8FileIfExistsSync(paths.statePath)).toBe(
      'not a review state JSON',
    );
    expect(readdirSync(paths.reviewDirectory).sort()).toEqual(filesBefore);
    expect(runReviewStateFixtureGit(projectRoot, ['rev-parse', 'HEAD'])).toBe(
      currentHead,
    );
    expect(
      runReviewStateFixtureGit(projectRoot, ['status', '--porcelain', '-z']),
    ).toBe(statusBefore);
  });
});
