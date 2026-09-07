import { existsSync, mkdtempSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableJoin,
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

import { runReviewStateFixtureGit } from './reviewState/helpers/runReviewStateFixtureGit.js';

/** Temporary repository whose actual HEAD every verdict report records. */
let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-assess-verdict-'));
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

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('review_state assess recorded revalidation verdict', () => {
  it.each([
    {
      name: 'PASS with LF',
      verdict: 'PASS',
      eol: '\n',
      stage: REVIEW_ENTRY_STAGES.COMPLETE,
    },
    {
      name: 'FAIL with CRLF',
      verdict: 'FAIL',
      eol: '\r\n',
      stage: REVIEW_ENTRY_STAGES.COMPLETE,
    },
    {
      name: 'INCONCLUSIVE',
      verdict: 'INCONCLUSIVE',
      eol: '\n',
      stage: REVIEW_ENTRY_STAGES.COMPLETE,
    },
    {
      name: 'missing verdict',
      verdict: null,
      eol: '\n',
      stage: REVIEW_ENTRY_STAGES.REVALIDATE,
    },
    {
      name: 'unrecognized verdict',
      verdict: 'NOT_A_VERDICT',
      eol: '\n',
      stage: REVIEW_ENTRY_STAGES.REVALIDATE,
    },
    {
      name: 'template placeholder',
      verdict: 'PASS | FAIL | INCONCLUSIVE',
      eol: '\n',
      stage: REVIEW_ENTRY_STAGES.REVALIDATE,
    },
  ])(
    'enters $stage for a current-head report with $name',
    async ({ verdict, eol, stage }) => {
      const paths = resolveReviewStatePaths(projectRoot, 'main');
      const head = runReviewStateFixtureGit(projectRoot, ['rev-parse', 'HEAD']);
      const metadata = verdict === null ? '' : `verdict: ${verdict}${eol}`;
      const bodyVerdict =
        stage === REVIEW_ENTRY_STAGES.COMPLETE ? verdict : 'PASS';
      ensureDirectorySync(paths.reviewDirectory);
      writeFileAtomicallySync(
        portableJoin(
          paths.reviewDirectory,
          REVIEW_STATE_FILE_NAMES.RE_VALIDATE,
        ),
        `---${eol}head_sha: ${head}${eol}${metadata}---${eol}${eol}## Verdict${eol}${eol}${bodyVerdict}${eol}`,
      );
      writeFileAtomicallySync(paths.fixRequestsPath, '# Fix requests\n');
      writeFileAtomicallySync(
        portableJoin(
          paths.reviewDirectory,
          REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
        ),
        '# Justifications\n',
      );

      const result = await handleReviewState({
        action: REVIEW_STATE_ACTIONS.ASSESS,
        projectRoot,
        branchName: 'main',
        baseRef: 'main',
        hasPullRequest: true,
      });

      expect(result.status).toBe('ok');
      expect(result.summary.entryStage).toBe(stage);
      expect(result.data?.assessment).toMatchObject({ entryStage: stage });
      expect(existsSync(paths.statePath)).toBe(false);
    },
  );
});
