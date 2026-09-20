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
import {
  type RestructureResult,
  handleRestructure,
} from '../../../mcp/tools/restructure/index.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../types/report.js';
import type {
  PlacementRequest,
  RestructurePlan,
} from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { handleFacts } from '../../../mcp/tools/facts/index.js';
import type { FactsStatusData } from '../../../mcp/tools/facts/index.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';
import { FIXTURE_INTENT } from '../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';

/** DETAIL.md for the added fractals. */
const DETAIL =
  '# Fixture contract\n\n## Requirements\n\n- Keep the value deterministic.\n\n## API Contracts\n\n- The entry point exports the value.\n\n## Acceptance Criteria\n\n### AC-fixture — Value export\n\n- The value is exported.\n\n## Last Updated\n\n2026-09-07\n';

/**
 * Fractals `domain/c` and `domain/d` that import each other's entry point, and
 * `domain/c/peek.ts`, which reaches past `domain/d`'s entry point: a cycle and
 * a boundary violation that exist before any plan.
 */
const PREEXISTING_FILES: Readonly<Record<string, string>> = {
  'domain/c/INTENT.md': FIXTURE_INTENT,
  'domain/c/DETAIL.md': DETAIL,
  'domain/c/index.ts':
    "export { d } from '../d/index.js';\nexport { peek } from './peek.js';\nexport const c = 1;\n",
  'domain/c/peek.ts':
    "import { inner } from '../d/inner.js';\n\nexport const peek = inner;\n",
  'domain/d/INTENT.md': FIXTURE_INTENT,
  'domain/d/DETAIL.md': DETAIL,
  'domain/d/index.ts':
    "export { c } from '../c/index.js';\nexport const d = 2;\n",
  'domain/d/inner.ts': 'export const inner = 3;\n',
};

/** Temporary project removed after each case. */
let projectRoot: string;

afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

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
 * Write the shared-unit project plus the pre-existing cycle and violation.
 * @returns Nothing; `projectRoot` holds the project.
 */
async function writeProject(): Promise<void> {
  projectRoot = await writeSharedUnitRestructureProject();
  for (const [path, content] of Object.entries(PREEXISTING_FILES))
    writeReviewStateFixtureFile(projectRoot, path, content);
  await seedFacts(projectRoot);
}

/**
 * Plan the requests and persist the artifact.
 * @param requests Placement requests with project-relative source paths.
 * @returns The plan and its persisted artifact path.
 * @throws When the result is not a persisted plan.
 */
async function persistPlan(requests: PlacementRequest[]) {
  const plan = await handleRestructure({
    action: 'plan',
    path: projectRoot,
    requests: requests.map((request) => ({
      ...request,
      sourcePath: join(projectRoot, request.sourcePath),
    })),
  });
  if (!isPlanPayload(plan) || !plan.data)
    throw new Error('plan action returned no plan');
  const planPath = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!planPath) throw new Error('restructure plan was not persisted');
  return { data: plan.data, planPath };
}

/**
 * Carry out a plan's moves and suggested rewrites the way an external actor would.
 * @param plan Plan whose moves and `affectedImports` are applied in order.
 * @returns Nothing; the project tree holds the executed plan.
 * @throws When an affected import carries no suggested specifier.
 */
function executePlan(plan: RestructurePlan): void {
  for (const move of plan.moves) {
    mkdirSync(dirname(move.targetPath), { recursive: true });
    renameSync(move.sourcePath, move.targetPath);
  }
  for (const move of plan.moves)
    for (const rewrite of move.affectedImports) {
      if (!rewrite.suggestedSpecifier)
        throw new Error(`no suggestion for ${rewrite.consumerPath}`);
      writeFileSync(
        rewrite.consumerPath,
        readFileSync(rewrite.consumerPath, 'utf8').replace(
          `'${rewrite.currentSpecifier}'`,
          `'${rewrite.suggestedSpecifier}'`,
        ),
      );
    }
}

/**
 * Run postcondition and project its findings and pre-existing records.
 *
 * The facts of the executed tree are submitted first, which is the step the
 * restructure skill performs between the last write and this call (spec §11-9);
 * without it the postcondition would be judging a tree it has no records for.
 * @param planPath Persisted plan artifact.
 * @returns Validity plus `[code, project-relative path]` of both lists.
 */
async function postcondition(planPath: string) {
  await seedFacts(projectRoot);
  const result = await handleRestructure({
    action: 'postcondition',
    path: projectRoot,
    planPath,
  });
  if (!result.data || !('findings' in result.data))
    throw new Error('postcondition returned no validation result');
  const relative = ({ code, path }: { code: string; path?: string }) => [
    code,
    path?.slice(projectRoot.length + 1),
  ];
  return {
    status: result.status,
    valid: result.data.valid,
    findings: result.data.findings.map(relative),
    preexisting: result.data.preexisting.map(relative),
  };
}

/** The shared-unit move, which touches neither `domain/c` nor `domain/d`. */
const VALUE_MOVE: PlacementRequest = {
  sourcePath: 'domain/a/value.ts',
  contractIntent: 'internal',
  organNameHint: 'model',
};

describe('postcondition compares cycles and boundary violations with the plan-time baseline', () => {
  it('passes an unrelated move and reports what existed before as preexisting', async () => {
    await writeProject();
    const { data, planPath } = await persistPlan([VALUE_MOVE]);
    executePlan(data);
    expect(await postcondition(planPath)).toEqual({
      status: 'ok',
      valid: true,
      findings: [],
      preexisting: [
        ['import-boundary-violation', 'domain/c/peek.ts'],
        ['dependency-cycle', 'domain/c'],
      ],
    });
  });

  it('reports a cycle the execution creates as a finding beside the preexisting one', async () => {
    await writeProject();
    const { data, planPath } = await persistPlan([VALUE_MOVE]);
    executePlan(data);
    writeFileSync(
      join(projectRoot, 'domain/a/index.ts'),
      "export { a } from './use.js';\nexport { b } from '../b/index.js';\n",
    );
    writeFileSync(
      join(projectRoot, 'domain/b/index.ts'),
      "export { b } from './use.js';\nexport { a } from '../a/index.js';\n",
    );
    const result = await postcondition(planPath);
    expect(result.valid).toBe(false);
    expect(result.findings).toEqual([['dependency-cycle', 'domain/a']]);
    expect(result.preexisting).toContainEqual(['dependency-cycle', 'domain/c']);
  });

  it('reports a boundary violation the move creates as a finding', async () => {
    await writeProject();
    const { data, planPath } = await persistPlan([
      {
        sourcePath: 'domain/c',
        consumerPaths: [join(projectRoot, 'domain/d/index.ts')],
        contractIntent: 'independent',
      },
    ]);
    expect(data.moves.map(({ targetPath }) => targetPath)).toEqual([
      join(projectRoot, 'domain/d/c'),
    ]);
    executePlan(data);
    const result = await postcondition(planPath);
    expect(result.findings).toContainEqual([
      'import-boundary-violation',
      'domain/d/c/index.ts',
    ]);
    expect(result.preexisting).toContainEqual([
      'import-boundary-violation',
      'domain/d/c/peek.ts',
    ]);
  });

  it('identifies a cycle whose member the plan moved as the same cycle', async () => {
    await writeProject();
    const { data, planPath } = await persistPlan([
      {
        sourcePath: 'domain/c',
        consumerPaths: [join(projectRoot, 'index.ts')],
        contractIntent: 'independent',
      },
    ]);
    expect(data.moves.map(({ targetPath }) => targetPath)).toEqual([
      join(projectRoot, 'c'),
    ]);
    executePlan(data);
    const result = await postcondition(planPath);
    // The rewrite grew `../c/index.js` into `../../c/index.js`; the old text
    // survives inside the new one and must not be read as an edge nobody claims.
    expect(
      (
        (await handleFacts({ action: 'status', path: projectRoot }))
          .data as FactsStatusData
      ).unadjudicated.items,
    ).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.preexisting).toEqual([
      ['import-boundary-violation', 'c/peek.ts'],
      ['import-boundary-violation', 'domain/b/use.ts'],
      ['dependency-cycle', 'c'],
    ]);
  });
});

/** `domain/d/utils` is an organ of `domain/d`; `domain/c/reach.ts` reaches into it from outside its owner. */
const ORGAN_ACCESS_FILES: Readonly<Record<string, string>> = {
  'domain/d/utils/helper.ts': 'export const helper = 4;\n',
  'domain/c/reach.ts':
    "import { helper } from '../d/utils/helper.js';\n\nexport const reach = helper;\n",
};

describe('postcondition keeps organ-access violations in the comparison', () => {
  it('reports an organ access that existed before the plan as preexisting', async () => {
    await writeProject();
    for (const [path, content] of Object.entries(ORGAN_ACCESS_FILES))
      writeReviewStateFixtureFile(projectRoot, path, content);
    await seedFacts(projectRoot);
    const { data, planPath } = await persistPlan([VALUE_MOVE]);
    executePlan(data);
    const result = await postcondition(planPath);
    expect(result.findings).toEqual([]);
    expect(result.preexisting).toContainEqual([
      'import-boundary-violation',
      'domain/c/reach.ts',
    ]);
  });

  it('reports an organ access the execution creates as a finding', async () => {
    await writeProject();
    writeReviewStateFixtureFile(
      projectRoot,
      'domain/d/utils/helper.ts',
      ORGAN_ACCESS_FILES['domain/d/utils/helper.ts'],
    );
    await seedFacts(projectRoot);
    const { data, planPath } = await persistPlan([VALUE_MOVE]);
    executePlan(data);
    writeReviewStateFixtureFile(
      projectRoot,
      'domain/c/reach.ts',
      ORGAN_ACCESS_FILES['domain/c/reach.ts'],
    );
    const result = await postcondition(planPath);
    expect(result.valid).toBe(false);
    expect(result.findings).toEqual([
      ['import-boundary-violation', 'domain/c/reach.ts'],
    ]);
  });
});
