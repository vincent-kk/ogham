import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
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
import type { RestructurePlan } from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

import { persistPlanArtifact } from './helpers/persistPlanArtifact.js';

/** Temporary project and scratch directory removed after each case. */
const temporary: string[] = [];

afterEach(() => {
  for (const path of temporary.splice(0))
    rmSync(path, { recursive: true, force: true });
});

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
 * Plan and store the shared-unit move, execute it, then close a new cycle
 * `domain/a` ↔ `domain/b` through their entry points.
 * @returns Project root, the executed plan and its stored artifact path.
 */
async function executeWithNewCycle() {
  const projectRoot = await writeSharedUnitRestructureProject();
  temporary.push(projectRoot);
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
  if (!isPlanPayload(plan) || !plan.data) throw new Error('no plan');
  const planPath = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!planPath) throw new Error('plan was not persisted');
  const data: RestructurePlan = plan.data;
  for (const move of data.moves) {
    mkdirSync(dirname(move.targetPath), { recursive: true });
    renameSync(move.sourcePath, move.targetPath);
    for (const rewrite of move.affectedImports)
      writeFileSync(
        rewrite.consumerPath,
        readFileSync(rewrite.consumerPath, 'utf8').replace(
          `'${rewrite.currentSpecifier}'`,
          `'${rewrite.suggestedSpecifier ?? ''}'`,
        ),
      );
  }
  writeFileSync(
    join(projectRoot, 'domain/a/index.ts'),
    "export { a } from './use.js';\nexport { b } from '../b/index.js';\n",
  );
  writeFileSync(
    join(projectRoot, 'domain/b/index.ts'),
    "export { b } from './use.js';\nexport { a } from '../a/index.js';\n",
  );
  await seedFacts(projectRoot);
  return { projectRoot, planPath };
}

/**
 * Run postcondition on a plan artifact.
 * @param projectRoot Project the plan belongs to.
 * @param planPath Artifact to read.
 * @returns The validation result.
 */
function postcondition(projectRoot: string, planPath: string) {
  return handleRestructure({
    action: 'postcondition',
    path: projectRoot,
    planPath,
  });
}

describe('postcondition reads only the plan artifact the server stored', () => {
  it('fails an honest artifact whose execution closed a new cycle', async () => {
    const { projectRoot, planPath } = await executeWithNewCycle();
    const result = await postcondition(projectRoot, planPath);
    expect(result.status).toBe('violations');
    expect(
      result.data && 'findings' in result.data
        ? result.data.findings.map(({ code }) => code)
        : [],
    ).toContain('dependency-cycle');
  });

  it('refuses an artifact edited in place to list the new cycle as baseline', async () => {
    const { projectRoot, planPath } = await executeWithNewCycle();
    const artifact = JSON.parse(readFileSync(planPath, 'utf8'));
    artifact.data.baseline.cycles.push([
      join(projectRoot, 'domain/a'),
      join(projectRoot, 'domain/b'),
      join(projectRoot, 'domain/a'),
    ]);
    writeFileSync(planPath, JSON.stringify(artifact));
    await expect(postcondition(projectRoot, planPath)).rejects.toMatchObject({
      code: 'plan-artifact-invalid',
      nextAction: expect.stringContaining('Create a new plan'),
    });
  });

  it('refuses a byte-identical copy outside the artifact store', async () => {
    const { projectRoot, planPath } = await executeWithNewCycle();
    const scratch = mkdtempSync(join(tmpdir(), 'filid-plan-copy-'));
    temporary.push(scratch);
    const copy = join(scratch, planPath.split(/[\\/]/).pop() ?? 'plan.json');
    copyFileSync(planPath, copy);
    await expect(postcondition(projectRoot, copy)).rejects.toMatchObject({
      code: 'plan-artifact-invalid',
    });
  });

  it('refuses a stored artifact whose baseline names a path outside its root', async () => {
    const { projectRoot, planPath } = await executeWithNewCycle();
    const artifact = JSON.parse(readFileSync(planPath, 'utf8'));
    artifact.data.baseline.boundaryViolations.push({
      ruleId: 'external-import-boundary',
      consumerPath: '/elsewhere/use.ts',
      importedPath: join(projectRoot, 'domain/a/use.ts'),
    });
    await expect(
      postcondition(projectRoot, persistPlanArtifact(artifact)),
    ).rejects.toMatchObject({ code: 'plan-artifact-invalid' });
  });
});
