import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { materializeToolEnvelope } from '../../../core/infra/artifactStore/index.js';
import { computePlanReadHash } from '../../../core/restructure/planner/computePlanReadHash.js';
import {
  type RestructureResult,
  handleRestructure,
} from '../../../mcp/tools/restructure/index.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../types/report.js';
import type { PlacementRequest } from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

import { persistPlanArtifact } from './helpers/persistPlanArtifact.js';
import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';

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

/** Temporary FCA project whose shared `domain/a/value.ts` is planned to move. */
let projectRoot: string;
/** Directory outside the project; reading it as a file throws, so any read of it fails the test. */
let outsideDirectory: string;
/** Persisted plan artifact read by precondition; `value.ts` lands at `domain/model/value.ts`. */
let planPath: string;

/**
 * Plan the requests and persist the plan artifact.
 * @param requests Restructure requests of the plan.
 * @returns Path of the persisted plan artifact.
 */
async function persistPlan(requests: PlacementRequest[]): Promise<string> {
  const plan = await handleRestructure({
    action: 'plan',
    path: projectRoot,
    requests,
  });
  if (!isPlanPayload(plan)) throw new Error('plan action returned no plan');
  const artifact = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!artifact) throw new Error('restructure plan was not persisted');
  return artifact;
}

/**
 * Rewrite fields of the persisted plan and store the result under its digest
 * name, so the reader's inner defenses — not the store check — judge it.
 * @param fields Plan fields to overwrite.
 * @returns Nothing; `planPath` names the stored forged artifact.
 */
function forgePlan(fields: Record<string, unknown>): void {
  const artifact = JSON.parse(readFileSync(planPath, 'utf8'));
  Object.assign(artifact.data, fields);
  planPath = persistPlanArtifact(artifact);
}

/**
 * Create a symbolic link, or skip the running test where the platform refuses one.
 * @param target Existing path the link points at.
 * @param link Path of the new link.
 * @param skip The running test's skip function.
 * @returns Nothing; the link exists unless the test was skipped.
 */
function linkOrSkip(
  target: string,
  link: string,
  skip: (note: string) => never,
): void {
  try {
    symlinkSync(target, link);
  } catch {
    skip('symbolic links cannot be created on this platform');
  }
}

/**
 * Finding codes of a precondition run against the current project tree.
 * @param path Persisted plan artifact.
 * @returns Codes of the precondition findings.
 */
async function preconditionCodes(path: string): Promise<string[] | null> {
  const result = await handleRestructure({
    action: 'precondition',
    path: projectRoot,
    planPath: path,
  });
  return result.data && 'findings' in result.data
    ? result.data.findings.map(({ code }) => code)
    : null;
}

beforeEach(async () => {
  projectRoot = await writeSharedUnitRestructureProject();
  outsideDirectory = mkdtempSync(join(tmp(), 'filid-outside-'));
  planPath = await persistPlan([
    {
      sourcePath: join(projectRoot, 'domain/a/value.ts'),
      contractIntent: 'internal',
      organNameHint: 'model',
    },
  ]);
});
afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(outsideDirectory, { recursive: true, force: true });
});

describe('restructure precondition reads only what the plan read', () => {
  it.each([
    ['the moved source', 'domain/a/value.ts', ['snapshot-hash-mismatch']],
    ['a consumer', 'domain/b/use.ts', ['snapshot-hash-mismatch']],
    ['an unrelated file', 'index.ts', []],
  ])('after an edit to %s (%s) reports %j', async (_label, path, codes) => {
    appendFileSync(join(projectRoot, path), '\n// edited after planning\n');
    expect(await preconditionCodes(planPath)).toEqual(codes);
  });

  it.each([
    ['an INTENT.md in a target ancestor', 'domain/model/INTENT.md'],
    ['a file at the file unit target', 'domain/model/value.ts'],
  ])(
    'reports snapshot-hash-mismatch after creating %s (%s)',
    async (_label, path) => {
      writeReviewStateFixtureFile(
        projectRoot,
        path,
        'created after planning\n',
      );
      expect(await preconditionCodes(planPath)).toEqual([
        'snapshot-hash-mismatch',
      ]);
    },
  );

  it('reports snapshot-hash-mismatch after creating a directory at a fractal unit target (domain/b/parts)', async () => {
    writeReviewStateFixtureFile(
      projectRoot,
      'domain/a/parts/index.ts',
      'export const part = 1;\n',
    );
    writeReviewStateFixtureFile(
      projectRoot,
      'domain/b/use.ts',
      "import { part } from '../a/parts/index.js';\nimport { value } from '../a/value.js';\n\nexport const b = value + part;\n",
    );
    await seedFacts(projectRoot);
    const fractalPlan = await persistPlan([
      {
        sourcePath: join(projectRoot, 'domain/a/parts'),
        contractIntent: 'independent',
      },
    ]);
    mkdirSync(join(projectRoot, 'domain/b/parts'));
    expect(await preconditionCodes(fractalPlan)).toEqual([
      'snapshot-hash-mismatch',
    ]);
  });

  it('reads a target ancestor that is a file as a missing path instead of throwing', async () => {
    writeFileSync(join(projectRoot, 'domain/model'), 'not a directory\n');
    expect(await preconditionCodes(planPath)).toEqual([]);
  });

  it('rejects a schema 2 plan artifact and asks for a new plan', async () => {
    const artifact = JSON.parse(readFileSync(planPath, 'utf8'));
    artifact.data.schemaVersion = 2;
    await expect(
      handleRestructure({
        action: 'precondition',
        path: projectRoot,
        planPath: persistPlanArtifact(artifact),
      }),
    ).rejects.toMatchObject({
      code: 'plan-artifact-invalid',
      nextAction: expect.stringContaining('Create a new plan'),
    });
  });

  it('reports snapshot-hash-mismatch when a read path ancestor becomes a plain file', async () => {
    rmSync(join(projectRoot, 'domain/a'), { recursive: true, force: true });
    writeFileSync(join(projectRoot, 'domain/a'), 'not a directory\n');
    expect(await preconditionCodes(planPath)).toEqual([
      'snapshot-hash-mismatch',
    ]);
  });

  it('reports snapshot-hash-mismatch when a read path becomes a directory', async () => {
    rmSync(join(projectRoot, 'domain/a/value.ts'));
    mkdirSync(join(projectRoot, 'domain/a/value.ts'));
    expect(await preconditionCodes(planPath)).toEqual([
      'snapshot-hash-mismatch',
    ]);
  });
});

describe('restructure precondition never reads outside the project root', () => {
  it.each([['probePaths'], ['readPaths']])(
    'rejects a plan artifact whose %s leaves the project root',
    async (field) => {
      forgePlan({ [field]: [outsideDirectory] });
      await expect(preconditionCodes(planPath)).rejects.toMatchObject({
        code: 'plan-artifact-invalid',
        nextAction: expect.stringContaining('Create a new plan'),
      });
    },
  );

  it('reports only project-root-mismatch for a plan forged to the filesystem root', async () => {
    forgePlan({ projectRoot: '/', readPaths: [outsideDirectory] });
    expect(await preconditionCodes(planPath)).toEqual([
      'project-root-mismatch',
    ]);
  });

  it.for([['probePaths'], ['readPaths']])(
    'rejects a plan artifact whose %s escape the project root through a symbolic link',
    async ([field], { skip }) => {
      mkdirSync(join(outsideDirectory, 'escaped.ts'));
      linkOrSkip(outsideDirectory, join(projectRoot, 'domain/link'), skip);
      forgePlan({ [field]: [join(projectRoot, 'domain/link/escaped.ts')] });
      await expect(preconditionCodes(planPath)).rejects.toMatchObject({
        code: 'plan-artifact-invalid',
      });
    },
  );

  it('judges a plan whose paths cross a symbolic link inside the project', async ({
    skip,
  }) => {
    linkOrSkip(
      join(projectRoot, 'domain/a'),
      join(projectRoot, 'domain/alias'),
      skip,
    );
    const artifact = JSON.parse(readFileSync(planPath, 'utf8'));
    const probePaths = [
      ...artifact.data.probePaths,
      join(projectRoot, 'domain/alias/INTENT.md'),
    ];
    forgePlan({
      probePaths,
      readHash: computePlanReadHash(
        projectRoot,
        artifact.data.readPaths,
        probePaths,
      ),
    });
    expect(await preconditionCodes(planPath)).toEqual([]);
  });

  it('rejects an honest plan whose target turned into an outward link, and a new plan is read but held by that link', async ({
    skip,
  }) => {
    linkOrSkip(outsideDirectory, join(projectRoot, 'domain/model'), skip);
    await expect(preconditionCodes(planPath)).rejects.toMatchObject({
      code: 'plan-artifact-invalid',
      nextAction: expect.stringContaining('Create a new plan'),
    });
    const newPlan = await persistPlan([
      {
        sourcePath: join(projectRoot, 'domain/a/value.ts'),
        contractIntent: 'internal',
        organNameHint: 'model',
      },
    ]);
    // The outward link is an unfollowed symlink the plan treats as related, so consumers stay undecided.
    expect(await preconditionCodes(newPlan)).toEqual(['unresolved-decisions']);
  });

  it('plans around a symbolic link loop at a probe path and leaves the probe out', async ({
    skip,
  }) => {
    linkOrSkip(
      join(projectRoot, 'domain/model'),
      join(projectRoot, 'domain/model'),
      skip,
    );
    const loopPlan = await persistPlan([
      {
        sourcePath: join(projectRoot, 'domain/a/value.ts'),
        contractIntent: 'internal',
        organNameHint: 'model',
      },
    ]);
    const { probePaths } = JSON.parse(readFileSync(loopPlan, 'utf8')).data;
    expect(
      probePaths.filter((path: string) =>
        path.startsWith(join(projectRoot, 'domain/model')),
      ),
    ).toEqual([]);
  });

  it('rejects a plan artifact that lists a path through a symbolic link loop', async ({
    skip,
  }) => {
    linkOrSkip(
      join(projectRoot, 'domain/loop'),
      join(projectRoot, 'domain/loop'),
      skip,
    );
    forgePlan({ probePaths: [join(projectRoot, 'domain/loop/INTENT.md')] });
    await expect(preconditionCodes(planPath)).rejects.toMatchObject({
      code: 'plan-artifact-invalid',
    });
  });
});
