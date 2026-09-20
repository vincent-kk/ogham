import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
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
  RestructureValidationSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';

/** JSX text whose apostrophe leaves the lexer unsure of every reference after it; names no moved unit. */
const UNRELATED_NOTE =
  "export const Note = () => <p>Don't</p>; export { other } from './other.js';\n";

/** The same apostrophe, followed by a reference that names the moved unit's stem. */
const NAMING_NOTE =
  "export const Note = () => <p>Don't</p>; export { value } from '../a/value.js';\n";

/** Temporary FCA project whose shared `domain/a/value.ts` is planned to move. */
let projectRoot: string;
/** Directory outside the project, removed with it. */
let outsideDirectory: string | undefined;

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  if (outsideDirectory)
    rmSync(outsideDirectory, { recursive: true, force: true });
  outsideDirectory = undefined;
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
 * Narrow a restructure result to a precondition or postcondition summary.
 * @param payload Result of any restructure action.
 * @returns That validation's summary.
 * @throws When the payload came from the plan action instead.
 */
function validationSummary(
  payload: RestructureResult,
): RestructureValidationSummary {
  if (isPlanPayload(payload))
    throw new Error('restructure returned a plan, not a validation');
  return payload.summary;
}

/**
 * Write the shared-unit project with `domain/b/note.tsx` holding the given text.
 * @param note Text of the uncertain file.
 * @returns Nothing; `projectRoot` holds the project.
 */
async function writeProjectWithNote(note: string): Promise<void> {
  projectRoot = await writeSharedUnitRestructureProject();
  writeReviewStateFixtureFile(projectRoot, 'domain/b/note.tsx', note);
  writeReviewStateFixtureFile(
    projectRoot,
    'domain/b/other.ts',
    'export const other = 1;\n',
  );
  await seedFacts(projectRoot);
}

/**
 * Plan moving `domain/a/value.ts` to its consumers' common fractal.
 * @returns The plan payload and its persisted artifact path.
 * @throws When the result is not a persisted plan.
 */
async function planValueMove() {
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
  if (!isPlanPayload(plan) || !plan.data)
    throw new Error('plan action returned no plan');
  const planPath = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!planPath) throw new Error('restructure plan was not persisted');
  return { plan, data: plan.data, planPath };
}

describe('an uncertain file blocks a restructure plan only when it relates to the move', () => {
  it('plans ok beside an unrelated JSX apostrophe and reports the file as information', async () => {
    await writeProjectWithNote(UNRELATED_NOTE);
    const { plan, data } = await planValueMove();
    expect(plan.status).toBe('ok');
    expect(data.unknownFiles).toEqual({
      relevant: [],
      other: [
        { path: 'domain/b/note.tsx', causes: ['facts-uncertain'] },
      ],
    });
  });

  it('blocks when the same file names the moved stem as a path token', async () => {
    await writeProjectWithNote(NAMING_NOTE);
    const { plan, data } = await planValueMove();
    expect(plan.status).toBe('indeterminate');
    expect(data.unknownFiles.relevant).toEqual([
      { path: 'domain/b/note.tsx', causes: ['facts-uncertain'] },
    ]);
  });

  it('fails precondition when the unrelated file changes after planning', async () => {
    await writeProjectWithNote(UNRELATED_NOTE);
    const { planPath } = await planValueMove();
    writeFileSync(
      join(projectRoot, 'domain/b/note.tsx'),
      `${UNRELATED_NOTE}// edited\n`,
    );
    await seedFacts(projectRoot);
    const result = await handleRestructure({
      action: 'precondition',
      path: projectRoot,
      planPath,
    });
    expect(
      result.data && 'findings' in result.data
        ? result.data.findings.map(({ code }) => code)
        : [],
    ).toEqual(['snapshot-hash-mismatch']);
  });
});

describe('a postcondition does not assert an absence over unknown files', () => {
  it('stays indeterminate and asks for the facts of the files it could not read', async () => {
    await writeProjectWithNote(UNRELATED_NOTE);
    const { data, planPath } = await planValueMove();
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
    await seedFacts(projectRoot);
      const result = await handleRestructure({
      action: 'postcondition',
      path: projectRoot,
      planPath,
    });
    expect(result.status).toBe('indeterminate');
    expect(result.summary.nextAction).toMatch(
      /^Restructure not verified: 1 file\(s\) in this project have no facts/,
    );
    expect(result.summary.nextAction).toContain('facts');
    expect(result.summary.nextAction).not.toContain('report it complete');
    expect(
      result.data && 'unknownFiles' in result.data
        ? result.data.unknownFiles
        : null,
    ).toEqual({
      relevant: [],
      other: [{ path: 'domain/b/note.tsx', causes: ['facts-uncertain'] }],
    });
  });
});

describe('a confirmed violation is not hidden behind an evidence gap', () => {
  it('reports violations, not indeterminate, when the moves were never applied', async () => {
    await writeProjectWithNote(UNRELATED_NOTE);
    const { planPath } = await planValueMove();
    const result = await handleRestructure({
      action: 'postcondition',
      path: projectRoot,
      planPath,
    });
    expect(result.status).toBe('violations');
    expect(result.summary.nextAction).toMatch(
      /^Restructure not verified: follow each finding's nextAction/,
    );
    expect(result.summary.nextAction).toContain('1 file');
  });
});

describe('a validation says how much of the project its scope left unjudged', () => {
  it('counts each source file an exclusion drops and names the number in its next action', async () => {
    projectRoot = await writeSharedUnitRestructureProject();
    writeReviewStateFixtureFile(
      projectRoot,
      'tools/extra.ts',
      'export const extra = 1;\n',
    );
    await seedFacts(projectRoot);
    const { planPath } = await planValueMove();
    const wide = await handleRestructure({
      action: 'precondition',
      path: projectRoot,
      planPath,
    });
    writeReviewStateFixtureFile(
      projectRoot,
      '.filid/config.json',
      JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        facts: { excludes: ['tools/**'] },
      }),
    );
    await seedFacts(projectRoot);
    const narrowed = await handleRestructure({
      action: 'precondition',
      path: projectRoot,
      planPath,
    });
    const count = validationSummary(narrowed).filesOutsideFactsScope;
    // The project's documents are outside the facts scope too, and they are
    // deliberately not counted: only a source file the project dropped is.
    expect(validationSummary(wide).filesOutsideFactsScope).toBe(0);
    expect(count).toBe(1);
    expect(narrowed.summary.nextAction).toContain(
      `${count} file(s) of this project sit outside the declared facts scope`,
    );
    expect(narrowed.summary.nextAction).toContain('facts.covers');
  });
});

describe('a consumer behind a symbolic link out of the project is not silently dropped', () => {
  it.for([['file'], ['directory']] as const)(
    'does not plan ok beside a %s link that points outside',
    async ([kind], { skip }) => {
      projectRoot = await writeSharedUnitRestructureProject();
      outsideDirectory = mkdtempSync(join(tmp(), 'filid-outside-'));
      const consumer = join(outsideDirectory, 'use.ts');
      writeFileSync(
        consumer,
        "import { value } from '../a/value.js';\n\nexport const c = value;\n",
      );
      const link = join(
        projectRoot,
        'domain/b',
        kind === 'file' ? 'linked.ts' : 'linked',
      );
      mkdirSync(join(projectRoot, 'domain/b'), { recursive: true });
      try {
        symlinkSync(kind === 'file' ? consumer : outsideDirectory, link);
      } catch {
        skip('symbolic links cannot be created on this platform');
      }
      const { plan, data } = await planValueMove();
      expect(plan.status).toBe('indeterminate');
      expect(data.unknownFiles.relevant).toEqual([
        {
          path: kind === 'file' ? 'domain/b/linked.ts' : 'domain/b/linked',
          causes: ['symlink-not-followed'],
        },
      ]);
      expect(
        plan.diagnostics.filter(({ code }) => code === 'symlink-not-followed'),
      ).toMatchObject([
        {
          path: link,
          affects: ['dependencies', 'boundaries'],
        },
      ]);
    },
  );
});

describe('an unfollowed link leaves the list once its own name is excluded', () => {
  it.for([['file'], ['directory']] as const)(
    'drops a %s link named in structure.additionalExcludedDirectories, as its diagnostic says',
    async ([kind], { skip }) => {
      const name = kind === 'file' ? 'linked.ts' : 'vendor';
      const linkPath = kind === 'file' ? `domain/b/${name}` : name;
      projectRoot = await writeSharedUnitRestructureProject();
      outsideDirectory = mkdtempSync(join(tmp(), 'filid-outside-'));
      const consumer = join(outsideDirectory, 'use.ts');
      writeFileSync(consumer, 'export const c = 1;\n');
      try {
        symlinkSync(
          kind === 'file' ? consumer : outsideDirectory,
          join(projectRoot, linkPath),
        );
      } catch {
        skip('symbolic links cannot be created on this platform');
      }
      const before = await planValueMove();
      const diagnostic = before.plan.diagnostics.find(
        ({ code }) => code === 'symlink-not-followed',
      );
      expect(diagnostic?.nextAction).toMatch(
        new RegExp(
          `^Add "${name.replace('.', '\\.')}" to structure\\.additionalExcludedDirectories`,
        ),
      );
      writeReviewStateFixtureFile(
        projectRoot,
        '.filid/config.json',
        JSON.stringify({
          version: '2.0',
          adapters: { mode: 'auto', enabled: [] },
          rules: {},
          structure: { additionalExcludedDirectories: [name] },
        }),
      );
      const after = await planValueMove();
      expect(after.data.unknownFiles).toEqual({ relevant: [], other: [] });
      expect(after.plan.status).toBe('ok');
    },
  );
});
