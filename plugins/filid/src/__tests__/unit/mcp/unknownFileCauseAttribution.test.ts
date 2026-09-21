import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import {
  type ToolSnapshotContext,
  createToolSnapshot,
} from '../../../mcp/tools/utils/createToolSnapshot.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';
import { FIXTURE_INTENT } from '../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';

/** Workspaces removed after each case. */
const workspaces: string[] = [];

/** One project file per state the graph has to attribute to its own file. */
const FILES: Readonly<Record<string, string>> = {
  'package.json': '{"name":"fixture","type":"module"}\n',
  'INTENT.md': FIXTURE_INTENT,
  'index.ts': "export { other } from './src/other.js';\n",
  'src/other.ts': 'export const other = 1;\n',
  'src/uncertain.tsx':
    "export const N = () => <p>Don't</p>; export { other } from './other.js';\n",
  'src/unresolved.ts': "export { gone } from './gone.js';\n",
  'src/stale.ts': 'export const stale = 1;\n',
  'src/unowned.ts': "export { outside } from '../../outside.js';\n",
};

/**
 * Write the fixture project and the file one reference resolves to outside it.
 * @returns The absolute project root.
 */
function writeProject(): string {
  const workspace = mkdtempSync(join(tmp(), 'filid-causes-'));
  workspaces.push(workspace);
  writeFileSync(join(workspace, 'outside.ts'), 'export const outside = 1;\n');
  const root = join(workspace, 'project');
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  writeFileSync(join(root, 'src/binary.ts'), Buffer.from([0x65, 0x00, 0x0a]));
  return root;
}

/**
 * Every cause the graph attributes to one project-relative path.
 * @param context Snapshot to read.
 * @param path Project-relative POSIX path.
 * @returns The causes, or an empty list when the file is not unknown.
 */
function causesOf(
  context: ToolSnapshotContext,
  path: string,
): readonly string[] {
  return (
    context.snapshot.dependencyGraph.unknownFiles.find(
      (file) => file.path === path,
    )?.causes ?? []
  );
}

/**
 * Dependency diagnostic codes the snapshot attributes to one file.
 * @param context Snapshot to read.
 * @param path Project-relative POSIX path.
 * @returns The codes of every diagnostic carrying that path.
 */
function diagnosticCodesOf(
  context: ToolSnapshotContext,
  path: string,
): string[] {
  const { snapshot } = context;
  return snapshot.diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.path !== undefined &&
        toProjectRelativePath(snapshot.projectRoot, diagnostic.path) === path,
    )
    .map(({ code }) => code);
}

afterEach(() => {
  for (const workspace of workspaces.splice(0))
    rmSync(workspace, { recursive: true, force: true });
});

describe('uncertainty is attributed to the file it came from', () => {
  it('names every in-scope file of a project that has no facts yet', async () => {
    const context = await createToolSnapshot(writeProject());

    expect(
      context.snapshot.dependencyGraph.unknownFiles.map(
        ({ path, causes }) => [path, causes] as const,
      ),
    ).toEqual([
      ['index.ts', ['facts-missing']],
      ['src/binary.ts', ['facts-missing']],
      ['src/other.ts', ['facts-missing']],
      ['src/stale.ts', ['facts-missing']],
      ['src/uncertain.tsx', ['facts-missing']],
      ['src/unowned.ts', ['facts-missing']],
      ['src/unresolved.ts', ['facts-missing']],
    ]);
  });

  it.each([
    ['an indeterminate reference', 'src/uncertain.tsx', ['facts-uncertain']],
    ['bytes no tool can read', 'src/binary.ts', ['facts-tool-error']],
    ['a record that no longer binds', 'src/stale.ts', ['facts-missing']],
    [
      'a reference resolving nowhere',
      'src/unresolved.ts',
      ['unresolved-local-dependency'],
    ],
    ['nothing of its own', 'index.ts', []],
    ['a reference leaving the project', 'src/unowned.ts', []],
  ])('attributes %s to %s alone', async (_shape, path, causes) => {
    const root = writeProject();
    await seedFacts(root);
    writeFileSync(join(root, 'src/stale.ts'), 'export const stale = 2;\n');
    const context = await createToolSnapshot(root);

    expect(causesOf(context, path)).toEqual(causes);
    for (const other of Object.keys(FILES))
      if (other !== path)
        for (const cause of causes)
          expect(causesOf(context, other)).not.toContain(cause);
  });

  it('names one of a file own causes in every diagnostic it carries', async () => {
    const root = writeProject();
    await seedFacts(root);
    writeFileSync(join(root, 'src/stale.ts'), 'export const stale = 2;\n');
    const context = await createToolSnapshot(root);

    const codes = diagnosticCodesOf(context, 'src/unresolved.ts');
    expect(codes).toEqual(['unresolved-local-dependency']);
    for (const path of Object.keys(FILES))
      for (const code of diagnosticCodesOf(context, path))
        expect(causesOf(context, path)).toContain(code);
  });
});
