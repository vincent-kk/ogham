import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';

/** Temporary committed repository used by the prepare dispatch contract. */
let fixture: ReviewStateSealFixture;

/** Temporary directory holding the untrusted change-context input file. */
let contextDirectory: string;

beforeEach(() => {
  fixture = createReviewStateSealFixture();
  contextDirectory = mkdtempSync(portableJoin(tmp(), 'filid-pr-body-'));
});

afterEach(() => {
  rmSync(contextDirectory, { recursive: true, force: true });
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('review_state prepare changeContextPath', () => {
  it('reads the file at dispatch and renders its excerpt in review briefs', async () => {
    const changeContextPath = portableJoin(contextDirectory, 'pr-body.md');
    writeFileSync(
      changeContextPath,
      [
        '## Summary',
        'Summary from the context file.',
        '## Contract',
        'Contract from the context file.',
        '## Review notes',
        'Review note from the context file.',
        '<details>',
        '<summary>Changes</summary>',
        'Changes body must stay out.',
        '</details>',
        '<details>',
        '<summary>Work context</summary>',
        'Work context body must stay out.',
        '</details>',
      ].join('\n'),
      'utf8',
    );

    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      baseRef: 'main',
      changeContextPath,
    });
    const group = prepared.data.groups[0];
    expect(group).toBeDefined();
    const brief = readFileSync(
      portableJoin(prepared.data.reviewDirectory, group!.briefPath),
      'utf8',
    );

    expect(brief).toContain('Summary from the context file.');
    expect(brief).toContain('Contract from the context file.');
    expect(brief).toContain('Review note from the context file.');
    expect(brief).not.toContain('Changes body must stay out.');
    expect(brief).not.toContain('Work context body must stay out.');
  });

  it('rejects simultaneous inline and file change context', async () => {
    const changeContextPath = portableJoin(contextDirectory, 'pr-body.md');
    writeFileSync(changeContextPath, '## Summary\nFile body\n', 'utf8');

    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        baseRef: 'main',
        changeContext: '## Summary\nInline body\n',
        changeContextPath,
      }),
    ).rejects.toThrow(
      'changeContext and changeContextPath are mutually exclusive',
    );
  });
});
