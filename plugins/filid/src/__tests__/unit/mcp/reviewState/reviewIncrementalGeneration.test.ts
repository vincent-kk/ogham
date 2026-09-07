import {
  cpSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { publishReviewGeneration } from '../../../../mcp/tools/reviewState/state/publishReviewGeneration.js';
import { resolveReviewGenerationPaths } from '../../../../mcp/tools/reviewState/state/resolveReviewGenerationPaths.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { writeReviewState } from '../../../../mcp/tools/reviewState/state/writeReviewState.js';

import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';

/** Each publication starts from an actual prepared legacy generation. */
let fixture: ReviewStateSealFixture;
/** Canonical state bytes against which publication performs its comparison. */
let before: string;
/** Current record is used to exercise state writer compatibility. */
let state: ReviewStateRecord;

/** Prepare-owned directory and document roots copied into fixture generations. */
const PREPARED_ARTIFACT_KEYS = [
  'briefsDirectory',
  'opinionsDirectory',
  'diffsDirectory',
  'sessionPath',
  'evidencePath',
] as const;

/**
 * Copy only prepare-owned artifacts to a distinct generation for publication.
 * @param paths Existing prepared fixture with all required artifacts.
 * @param id Fresh generation ID whose output directories are isolated.
 * @returns Paths containing the staged copies.
 */
function stage(paths: ReviewStatePaths, id: string): ReviewStatePaths {
  const staged = resolveReviewGenerationPaths(paths, id);
  for (const key of PREPARED_ARTIFACT_KEYS)
    cpSync(paths[key], staged[key], { recursive: true });
  return staged;
}

beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
  });
  before = readFileSync(prepared.data.statePath, 'utf8');
  state = JSON.parse(before) as ReviewStateRecord;
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('incremental generation publication', () => {
  it('isolates output paths and preserves the exact origin state and opinion bytes', () => {
    const paths = resolveReviewStatePaths(
      state.projectRoot,
      fixture.branchName,
    );
    const next = { ...state, generationId: 'a'.repeat(32) };
    const staged = stage(paths, next.generationId);
    const opinionPath = join(
      paths.reviewDirectory,
      state.groups[0].skeletonPath,
    );
    const opinionBytes = readFileSync(opinionPath, 'utf8');
    expect(staged.opinionsDirectory).not.toBe(paths.opinionsDirectory);
    expect(staged.handoffPath).toBe(join(staged.reviewDirectory, 'handoff.md'));
    publishReviewGeneration(staged, next, before);
    expect(
      readFileSync(join(staged.reviewDirectory, 'origin-state.json'), 'utf8'),
    ).toBe(before);
    expect(readFileSync(opinionPath, 'utf8')).toBe(opinionBytes);
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8')).generationId).toBe(
      next.generationId,
    );
  });

  it('refuses publication when validation changed state during preparation', () => {
    const paths = resolveReviewStatePaths(
      state.projectRoot,
      fixture.branchName,
    );
    const next = { ...state, generationId: 'a'.repeat(32) };
    const changed = `${before}\n`;
    writeFileSync(paths.statePath, changed);
    expect(() =>
      publishReviewGeneration(
        resolveReviewGenerationPaths(paths, next.generationId),
        next,
        before,
      ),
    ).toThrow(/changed|conflict/i);
    expect(readFileSync(paths.statePath, 'utf8')).toBe(changed);
  });

  it('rejects a late writer from the previous generation', () => {
    const paths = resolveReviewStatePaths(
      state.projectRoot,
      fixture.branchName,
    );
    const next = { ...state, generationId: 'a'.repeat(32) };
    publishReviewGeneration(stage(paths, next.generationId), next, before);
    expect(() => writeReviewState(paths.statePath, state)).toThrow(
      /generation/i,
    );
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8')).generationId).toBe(
      next.generationId,
    );
  });

  it('rejects traversal and a symlinked generation container before writing', () => {
    const paths = resolveReviewStatePaths(
      state.projectRoot,
      fixture.branchName,
    );
    expect(() => resolveReviewGenerationPaths(paths, '../escape')).toThrow();
    symlinkSync(
      fixture.pluginRoot,
      join(
        paths.reviewRoot,
        paths.normalizedBranch,
        'generations',
        'a'.repeat(32),
      ),
      'dir',
    );
    expect(() => resolveReviewGenerationPaths(paths, 'a'.repeat(32))).toThrow();
    expect(readFileSync(paths.statePath, 'utf8')).toBe(before);
  });

  it('keeps the origin active when required staged artifacts are missing', () => {
    const paths = resolveReviewStatePaths(
      state.projectRoot,
      fixture.branchName,
    );
    const next = { ...state, generationId: 'a'.repeat(32) };
    expect(() =>
      publishReviewGeneration(
        resolveReviewGenerationPaths(paths, next.generationId),
        next,
        before,
      ),
    ).toThrow(/artifact/i);
    expect(readFileSync(paths.statePath, 'utf8')).toBe(before);
  });
});
