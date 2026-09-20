import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Prepared review whose state file each case makes unusable. */
let fixture: Awaited<ReturnType<typeof createReviewStateSealFixture>>;
/** Branch-level state file of the prepared review. */
let statePath: string;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 1);
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'low',
  });
  statePath = prepared.data.statePath;
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/** Names of the archived states beside the branch state file. */
const archived = () =>
  readdirSync(dirname(statePath))
    .filter((name) => name.startsWith('replaced-state-'))
    .sort();

/** Replace the state file with bytes prepare cannot resume from. */
function makeUnusable(
  kind: 'unparseable' | 'other-schema' | 'malformed' | 'outdated-policy',
) {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (kind === 'unparseable') return writeFileSync(statePath, '{ not json');
  if (kind === 'other-schema')
    return writeFileSync(
      statePath,
      JSON.stringify({ ...state, schemaVersion: 1 }),
    );
  if (kind === 'malformed')
    return writeFileSync(
      statePath,
      JSON.stringify({ ...state, groups: 'not-a-list' }),
    );
  return writeFileSync(
    statePath,
    JSON.stringify({ ...state, validationPolicyVersion: 1 }),
  );
}

describe('prepare replaces a review state it cannot use', () => {
  it.each([
    ['unparseable', 'review-state-schema-mismatch'],
    ['other-schema', 'review-state-schema-mismatch'],
    ['malformed', 'review-state-invalid'],
    ['outdated-policy', 'review-validation-policy-outdated'],
  ] as const)(
    'keeps the bytes of a %s state and prepares a new generation',
    async (kind, reasonCode) => {
      makeUnusable(kind);
      const bytes = readFileSync(statePath, 'utf8');
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      expect(prepared.status).toBe('ok');
      expect(prepared.summary.disposition).toBe('fresh');
      const replaced = prepared.diagnostics.find(
        ({ code }) => code === 'review-state-replaced',
      );
      expect(replaced).toMatchObject({ affects: [] });
      expect(replaced?.message).toContain(reasonCode);
      expect(replaced?.nextAction).toMatch(/^Report that/);
      expect(archived()).toEqual(['replaced-state-1.json']);
      expect(
        readFileSync(join(dirname(statePath), 'replaced-state-1.json'), 'utf8'),
      ).toBe(bytes);
      expect(existsSync(statePath)).toBe(true);
      expect(readFileSync(statePath, 'utf8')).not.toBe(bytes);
    },
  );

  it('numbers a second archived state instead of overwriting the first', async () => {
    makeUnusable('unparseable');
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    makeUnusable('unparseable');
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(archived()).toEqual([
      'replaced-state-1.json',
      'replaced-state-2.json',
    ]);
  });

  it('refuses a branch directory that is a symlink before writing anything', async () => {
    makeUnusable('unparseable');
    const branchDirectory = dirname(statePath);
    const outside = mkdtempSync(join(tmpdir(), 'filid-outside-'));
    renameSync(branchDirectory, join(outside, 'moved'));
    symlinkSync(join(outside, 'moved'), branchDirectory);
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      }),
    ).rejects.toThrow(/symbolic link/i);
    expect(
      readdirSync(join(outside, 'moved')).filter((name) =>
        name.startsWith('replaced-state-'),
      ),
    ).toEqual([]);
    rmSync(branchDirectory, { force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it('names the archive failure when the review directory cannot be written', async () => {
    makeUnusable('unparseable');
    const branchDirectory = dirname(statePath);
    chmodSync(branchDirectory, 0o555);
    try {
      await expect(
        handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          effort: 'low',
        }),
      ).rejects.toMatchObject({ code: 'review-state-archive-failed' });
    } finally {
      chmodSync(branchDirectory, 0o755);
    }
  });

  it.each(['checkpoint', 'seal'] as const)(
    'sends %s back to one prepare call without asking a person',
    async (action) => {
      makeUnusable('other-schema');
      const result = await handleReviewState({
        action,
        projectRoot: fixture.projectRoot,
      });
      const diagnostic = result.diagnostics[0]!;
      expect(diagnostic.nextAction).toContain('call prepare once');
      expect(diagnostic.nextAction).not.toMatch(/\buser\b/);
      expect(diagnostic.nextAction).toContain('without force');
    },
  );
});
