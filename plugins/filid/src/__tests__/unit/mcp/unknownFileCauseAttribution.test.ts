import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import {
  type ToolSnapshotContext,
  createToolSnapshot,
} from '../../../mcp/tools/utils/createToolSnapshot.js';
import { FIXTURE_INTENT } from '../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';

/** Directory holding the project and the file one reference resolves to outside it. */
let workspace: string;
/** Snapshot of the project, built once for every case. */
let context: ToolSnapshotContext;

/** One project file per reference shape the graph cannot confirm. */
const FILES: Readonly<Record<string, string>> = {
  'package.json': '{"name":"fixture","type":"module"}\n',
  'INTENT.md': FIXTURE_INTENT,
  'index.ts': "export { other } from './src/other.js';\n",
  'src/other.ts': 'export const other = 1;\n',
  'src/uncertain.tsx':
    "export const N = () => <p>Don't</p>; export { other } from './other.js';\n",
  'src/unresolved.ts': "export { gone } from './gone.js';\n",
  'src/both.tsx':
    "export const N = () => <p>Don't</p>; export { gone } from './gone.js';\n",
  'src/unowned.ts': "export { outside } from '../../outside.js';\n",
};

beforeAll(async () => {
  workspace = mkdtempSync(join(tmp(), 'filid-causes-'));
  writeFileSync(join(workspace, 'outside.ts'), 'export const outside = 1;\n');
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(workspace, 'project', path)), { recursive: true });
    writeFileSync(join(workspace, 'project', path), text);
  }
  context = await createToolSnapshot(join(workspace, 'project'));
});
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

describe('every dependency diagnostic on a file names one of that file causes', () => {
  it.each([
    ['uncertain only', 'src/uncertain.tsx'],
    ['unresolved only', 'src/unresolved.ts'],
    ['uncertain and unresolved', 'src/both.tsx'],
    ['unowned target', 'src/unowned.ts'],
  ])('%s: %s', (_shape, path) => {
    const { snapshot } = context;
    const codes = snapshot.diagnostics
      .filter(
        (diagnostic) =>
          diagnostic.path !== undefined &&
          toProjectRelativePath(snapshot.projectRoot, diagnostic.path) === path,
      )
      .map(({ code }) => code);
    const causes =
      snapshot.dependencyGraph.unknownFiles.find((file) => file.path === path)
        ?.causes ?? [];
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) expect(causes).toContain(code);
  });
});
