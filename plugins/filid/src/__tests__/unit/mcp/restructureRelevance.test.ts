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
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
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
 * Write the shared-unit project with `domain/b/note.tsx` holding the given text.
 * @param note Text of the uncertain file.
 * @returns Nothing; `projectRoot` holds the project.
 */
function writeProjectWithNote(note: string): void {
  projectRoot = writeSharedUnitRestructureProject();
  writeReviewStateFixtureFile(projectRoot, 'domain/b/note.tsx', note);
  writeReviewStateFixtureFile(
    projectRoot,
    'domain/b/other.ts',
    'export const other = 1;\n',
  );
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
    writeProjectWithNote(UNRELATED_NOTE);
    const { plan, data } = await planValueMove();
    expect(plan.status).toBe('ok');
    expect(data.unknownFiles).toEqual({
      relevant: [],
      other: [
        { path: 'domain/b/note.tsx', causes: ['uncertain-local-dependency'] },
      ],
    });
  });

  it('blocks when the same file names the moved stem as a path token', async () => {
    writeProjectWithNote(NAMING_NOTE);
    const { plan, data } = await planValueMove();
    expect(plan.status).toBe('indeterminate');
    expect(data.unknownFiles.relevant).toEqual([
      { path: 'domain/b/note.tsx', causes: ['uncertain-local-dependency'] },
    ]);
  });

  it('fails precondition when the unrelated file changes after planning', async () => {
    writeProjectWithNote(UNRELATED_NOTE);
    const { planPath } = await planValueMove();
    writeFileSync(
      join(projectRoot, 'domain/b/note.tsx'),
      `${UNRELATED_NOTE}// edited\n`,
    );
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

describe('a postcondition that passes beside unrelated unknown files states its limit', () => {
  it('passes on the known edges and names how many files it could not read references of', async () => {
    writeProjectWithNote(UNRELATED_NOTE);
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
    const result = await handleRestructure({
      action: 'postcondition',
      path: projectRoot,
      planPath,
    });
    expect(result.status).toBe('ok');
    expect(result.summary.nextAction).toContain('known edges');
    expect(result.summary.nextAction).toContain('1 file');
    expect(result.summary.nextAction).not.toContain('report it complete');
  });
});

describe('a consumer behind a symbolic link out of the project is not silently dropped', () => {
  it.for([['file'], ['directory']] as const)(
    'does not plan ok beside a %s link that points outside',
    async ([kind], { skip }) => {
      projectRoot = writeSharedUnitRestructureProject();
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
      projectRoot = writeSharedUnitRestructureProject();
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
