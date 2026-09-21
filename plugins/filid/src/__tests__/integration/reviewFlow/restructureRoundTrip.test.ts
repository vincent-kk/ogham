import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { materializeToolEnvelope } from '../../../core/infra/artifactStore/index.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import {
  type RestructureResult,
  handleRestructure,
} from '../../../mcp/tools/restructure/index.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../types/report.js';
import type { RestructurePlan } from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { seedFacts } from '../helpers/seedFacts.js';

import { writeSharedUnitRestructureProject } from './helpers/writeSharedUnitRestructureProject.js';

/** Config whose one unknown top-level key makes the snapshot emit `config-warning`. */
const CONFIG_WITH_UNKNOWN_KEY = {
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  unknownKey: true,
};

/** Temporary project removed after each case. */
let projectRoot: string;

/**
 * Narrow a restructure result to the plan action's payload.
 * @param payload Result of any restructure action.
 * @returns Whether the payload carries a plan summary.
 */
function isPlanPayload(
  payload: RestructureResult,
): payload is ToolPayload<RestructurePlanSummary, RestructurePlanData> {
  return 'planId' in payload.summary;
}

/**
 * Plan moving the shared `domain/a/value.ts` to its consumers' common fractal and persist it.
 * @returns The plan payload, its plan data, and the absolute artifact path precondition and postcondition read.
 * @throws When the persisted artifact path is missing or the payload is not a plan.
 */
async function planSharedUnitMove() {
  const plan = await handleRestructure({
    action: 'plan',
    path: projectRoot,
    requests: [
      {
        sourcePath: join(projectRoot, 'domain/a/value.ts'),
        consumerPaths: [
          join(projectRoot, 'domain/a/use.ts'),
          join(projectRoot, 'domain/b/use.ts'),
        ],
        contractIntent: 'internal',
        organNameHint: 'model',
      },
    ],
  });
  if (!isPlanPayload(plan) || !plan.data)
    throw new Error('plan action returned no plan');
  const planPath = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!planPath) throw new Error('restructure plan was not persisted');
  return { plan, data: plan.data, planPath };
}

/**
 * Carry out a plan's moves and import rewrites the way an external actor would.
 *
 * Submitting the moved tree's facts afterwards is part of the act: the
 * restructure skill extracts and submits once every write is done, before the
 * postcondition reads what the store holds (spec §11-9).
 * @param plan Plan whose moves and suggested `affectedImports` are applied in order.
 * @returns Nothing; the project tree holds the executed plan and its facts.
 * @throws When an affected import carries no suggested specifier to apply.
 */
async function executePlan(plan: RestructurePlan): Promise<void> {
  for (const move of plan.moves) {
    mkdirSync(dirname(move.targetPath), { recursive: true });
    renameSync(move.sourcePath, move.targetPath);
    for (const rewrite of move.affectedImports) {
      if (!rewrite.suggestedSpecifier)
        throw new Error(
          `The fixture plan left ${rewrite.consumerPath} "${rewrite.currentSpecifier}" without a suggested specifier.`,
        );
      writeFileSync(
        rewrite.consumerPath,
        readFileSync(rewrite.consumerPath, 'utf8').replace(
          `'${rewrite.currentSpecifier}'`,
          `'${rewrite.suggestedSpecifier}'`,
        ),
      );
    }
  }
  await seedFacts(projectRoot);
}

/**
 * Validate a persisted plan against the current project tree.
 * @param action Lifecycle boundary to check.
 * @param planPath Absolute persisted plan artifact.
 * @returns The validation payload.
 */
function validate(action: 'precondition' | 'postcondition', planPath: string) {
  return handleRestructure({ action, path: projectRoot, planPath });
}

afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

describe('restructure plan → precondition → postcondition round trip', () => {
  it('plans one organ move with both consumer rewrites', async () => {
    projectRoot = await writeSharedUnitRestructureProject();
    const { plan, data } = await planSharedUnitMove();
    expect(plan.status).toBe('ok');
    expect(plan.diagnostics).toEqual([]);
    expect(data.unresolved).toEqual([]);
    expect(data.moves).toMatchObject([
      {
        sourcePath: join(projectRoot, 'domain/a/value.ts'),
        targetPath: join(projectRoot, 'domain/model/value.ts'),
        targetNodeType: 'organ',
        basis: 'lowest-common-fractal',
        lowestCommonFractalPath: join(projectRoot, 'domain'),
        affectedImports: [
          {
            consumerPath: join(projectRoot, 'domain/a/use.ts'),
            currentSpecifier: './value.js',
            requiredResolvedPath: join(projectRoot, 'domain/model/value.ts'),
            suggestedSpecifier: '../model/value.js',
          },
          {
            consumerPath: join(projectRoot, 'domain/b/use.ts'),
            currentSpecifier: '../a/value.js',
            requiredResolvedPath: join(projectRoot, 'domain/model/value.ts'),
            suggestedSpecifier: '../model/value.js',
          },
        ],
        preservedImports: [],
        requiresDecision: false,
      },
    ]);
  });

  it('passes precondition, then postcondition after the actor executes the plan', async () => {
    projectRoot = await writeSharedUnitRestructureProject();
    const { data, planPath } = await planSharedUnitMove();
    const before = await validate('precondition', planPath);
    expect(before).toMatchObject({
      status: 'ok',
      data: { valid: true, findings: [] },
      diagnostics: [],
    });
    await executePlan(data);
    const after = await validate('postcondition', planPath);
    expect(after).toMatchObject({
      status: 'ok',
      data: { valid: true, findings: [] },
      diagnostics: [],
    });
  });

  it('fails postcondition while the plan is not executed', async () => {
    projectRoot = await writeSharedUnitRestructureProject();
    const { planPath } = await planSharedUnitMove();
    const result = await validate('postcondition', planPath);
    expect(result.status).toBe('violations');
    expect(result.data).toMatchObject({ valid: false });
    expect(
      result.data && 'findings' in result.data
        ? result.data.findings.map(({ code, path }) => [
            code,
            path === undefined
              ? undefined
              : toProjectRelativePath(projectRoot, path),
          ])
        : [],
    ).toEqual([
      ['source-still-present', 'domain/a/value.ts'],
      ['target-missing', 'domain/model/value.ts'],
      ['import-rewrite-missing', 'domain/a/use.ts'],
      ['import-rewrite-missing', 'domain/b/use.ts'],
      ['import-boundary-violation', 'domain/b/use.ts'],
    ]);
  });

  it('fails precondition with snapshot-hash-mismatch when a read file drifts after planning', async () => {
    projectRoot = await writeSharedUnitRestructureProject();
    const { planPath } = await planSharedUnitMove();
    writeFileSync(
      join(projectRoot, 'domain/b/use.ts'),
      "import { value } from '../a/value.js';\n\nexport const b = value + 3;\n",
    );
    await seedFacts(projectRoot);
    const result = await validate('precondition', planPath);
    expect(result.status).toBe('violations');
    expect(
      result.data && 'findings' in result.data
        ? result.data.findings.map(({ code }) => code)
        : [],
    ).toEqual(['snapshot-hash-mismatch']);
  });
});

// An unknown key may have been meant to tighten the analysis, so its config-warning affects every axis.
describe('an unknown config key keeps every restructure step indeterminate', () => {
  it('plans with status indeterminate beside the config-warning', async () => {
    projectRoot = await writeSharedUnitRestructureProject(
      CONFIG_WITH_UNKNOWN_KEY,
    );
    const { plan, data } = await planSharedUnitMove();
    expect(plan.status).toBe('indeterminate');
    expect(plan.diagnostics.map(({ code }) => code)).toEqual([
      'config-warning',
    ]);
    expect(data.unresolved).toEqual([]);
    expect(data.moves).toHaveLength(1);
  });

  it('validates precondition and postcondition as indeterminate although the plan validates', async () => {
    projectRoot = await writeSharedUnitRestructureProject(
      CONFIG_WITH_UNKNOWN_KEY,
    );
    const { data, planPath } = await planSharedUnitMove();
    const before = await validate('precondition', planPath);
    expect(before).toMatchObject({
      status: 'indeterminate',
      data: { valid: true, findings: [] },
    });
    expect(before.diagnostics.map(({ code }) => code)).toEqual([
      'config-warning',
    ]);
    await executePlan(data);
    const after = await validate('postcondition', planPath);
    expect(after).toMatchObject({
      status: 'indeterminate',
      data: { valid: true, findings: [] },
    });
    expect(after.diagnostics.map(({ code }) => code)).toEqual([
      'config-warning',
    ]);
  });
});
