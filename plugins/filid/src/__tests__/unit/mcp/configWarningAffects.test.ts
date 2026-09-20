import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { handleRestructure } from '../../../mcp/tools/restructure/index.js';
import { applyReviewContextNextAction } from '../../../mcp/tools/reviewState/scope/utils/applyReviewContextNextAction.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

/** Smallest valid v2 config; each case spreads its own entries over it. */
const BASE_CONFIG = {
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
};

/** Every analysis axis, the impact of a warning whose dropped value may have tightened the analysis. */
const EVERY_AXIS = ['dependencies', 'boundaries', 'verification'];

/** Temporary project removed after each case. */
let projectRoot: string;

afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

/**
 * The `affects` of every config-warning a project with the given config produces.
 * @param config Config written to `.filid/config.json`.
 * @returns One `affects` list per config-warning.
 */
async function configWarningAffects(
  config: Record<string, unknown>,
): Promise<(readonly string[])[]> {
  projectRoot = writeSharedUnitRestructureProject(config);
  const { diagnostics } = await createToolSnapshot(projectRoot);
  return diagnostics
    .filter(({ code }) => code === 'config-warning')
    .map(({ affects }) => affects);
}

describe('a config-warning affects the axes its dropped entry could have changed', () => {
  it.each([
    [
      'an invalid structure.maxDepth',
      { structure: { maxDepth: 'deep' } },
      EVERY_AXIS,
    ],
    ['an unknown top-level key', { unknownSetting: true }, EVERY_AXIS],
    [
      'an invalid exempt list',
      { rules: { 'zero-peer-file': { exempt: 'src/**' } } },
      [],
    ],
    [
      'a bare ** exempt pattern',
      { rules: { 'zero-peer-file': { exempt: ['**'] } } },
      [],
    ],
    [
      'an invalid severity',
      { rules: { 'zero-peer-file': { severity: 'loud' } } },
      [],
    ],
    [
      'an invalid additionalAllowedPeers entry',
      { structure: { additionalAllowedPeers: 'README.md' } },
      [],
    ],
    [
      'an invalid generatedPaths entry',
      { structure: { generatedPaths: 'dist' } },
      [],
    ],
    [
      'an invalid entryPointOverrides value under an underscore key',
      { structure: { entryPointOverrides: { '_internal/mod': 'index.ts' } } },
      EVERY_AXIS,
    ],
    [
      'an invalid enabled flag',
      { rules: { 'zero-peer-file': { enabled: 'yes' } } },
      [],
    ],
  ])('%s (%j) gives affects %j', async (_label, extra, affects) => {
    expect(await configWarningAffects({ ...BASE_CONFIG, ...extra })).toEqual([
      affects,
    ]);
  });

  it('affects every axis when the whole config falls back to defaults', async () => {
    const warnings = await configWarningAffects({ version: '2.0' });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings).toContainEqual(EVERY_AXIS);
  });

  it('accepts $schema, $comment and _-prefixed keys at any depth without a warning', async () => {
    expect(
      await configWarningAffects({
        ...BASE_CONFIG,
        $schema: 'https://example.invalid/filid.json',
        $comment: 'owner notes',
        _note: 'top level',
        structure: { _why: 'nested' },
        rules: { 'zero-peer-file': { $comment: 'deep' } },
      }),
    ).toEqual([]);
  });

  it.each([
    [
      'an invalid structure.maxDepth',
      { structure: { maxDepth: 'deep' } },
      'indeterminate',
    ],
    [
      'an invalid exempt list',
      { rules: { 'zero-peer-file': { exempt: 'src/**' } } },
      'ok',
    ],
  ])(
    'a restructure plan beside %s (%j) is %s',
    async (_label, extra, status) => {
      projectRoot = writeSharedUnitRestructureProject({
        ...BASE_CONFIG,
        ...extra,
      });
      const plan = await handleRestructure({
        action: 'plan',
        path: projectRoot,
        requests: [
          {
            sourcePath: join(projectRoot, 'domain/a/value.ts'),
            contractIntent: 'internal',
            organNameHint: 'model',
          },
        ],
      });
      expect(plan.status).toBe(status);
    },
  );

  it.each([
    [
      [],
      'Continue the review; dropping this key changes no analysis conclusion. Report that the named key in the filid config is invalid and was dropped, so it should be fixed or removed; the review used the remaining valid settings.',
    ],
    [
      ['dependencies', 'boundaries', 'verification'],
      'Continue the review; the dropped entry may have tightened the analysis, so seal carries this diagnostic into the review blockers with its own next action. Do not report the review as complete while it remains; ask the user to fix or remove the named key in the filid config.',
    ],
  ] as const)(
    'gives a config-warning with affects %j the review next action %j',
    (affects, sentence) => {
      expect(
        applyReviewContextNextAction({
          code: 'config-warning',
          message: 'unknown key in <root>: "unknownSetting"',
          affects,
          nextAction: 'Fix the entry.',
        }).nextAction,
      ).toBe(`${sentence} Outside this review: Fix the entry.`);
    },
  );
});
