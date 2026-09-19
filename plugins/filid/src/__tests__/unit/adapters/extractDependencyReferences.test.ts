import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-dependency-resolution-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('dependency certainty around unterminated literals', () => {
  it('marks an import inside a swallowed span indeterminate', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    writeFileSync(join(root, 'b.ts'), 'export const b = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const s = <p>Don't</p>; const lazy = () => import('./a.ts');\nimport { b } from './b.ts';\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([
      { rawSpecifier: './b.ts', certainty: undefined },
      { rawSpecifier: './a.ts', certainty: 'indeterminate' },
    ]);
  });

  it('marks an import hidden behind a quote mispaired after a URL indeterminate', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const n = <a href=\"https://x.dev\">Don't</a>; import { a } from './a.ts';\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it('marks an import after a quote glued to a non-ASCII word indeterminate', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const n = <p>café'</p>; import('./a.ts'); const m = <p>é'</p>;\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it('marks an import after a quote glued to an astral word indeterminate', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const n = <p>caf\u{2070E}'</p>; import('./a.ts'); const m = <p>\u{2070E}'</p>;\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it('marks an import on the line a stray string continues onto indeterminate', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "render(<p>Don't</p>); f('q'); s = \"a\\\nb\"; import('./a.ts');\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it("keeps an import before the line's first quote exact", async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "import('./a.ts'); const s = \"x\"; render(<p>Don't</p>);\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: undefined }]);
  });

  it('distrusts an import the scan read as code inside a mispaired string', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      'render(<p>I\'m "quoted"</p>); f(\'import("./a.ts")\');\n',
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it("reports a code-read import after the line's first quote once, as indeterminate", async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const s = \"x\"; import('./a.ts'); render(<p>Don't</p>);\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './a.ts', certainty: 'indeterminate' }]);
  });

  it('marks references after a lost boundary indeterminate', async () => {
    writeFileSync(join(root, 'c.ts'), 'export const c = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const t = `${a ? <b>Don't</b> : b}`;\nimport { c } from './c.ts';\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty }) => ({ rawSpecifier, certainty }),
      ),
    ).toEqual([{ rawSpecifier: './c.ts', certainty: 'indeterminate' }]);
  });
});

describe('local dependency filename resolution regressions', () => {
  it.each([
    ['./SchemaNodePropsFlow.helpers', 'SchemaNodePropsFlow.helpers.tsx'],
    [
      './BranchStrategy.composition.fixtures',
      'BranchStrategy.composition.fixtures.ts',
    ],
    ['./feature.js', 'feature.ts'],
    ['./feature.mjs', 'feature.mts'],
    ['./feature.cjs', 'feature.cts'],
    ['./feature.helpers.js', 'feature.helpers.ts'],
    ['./feature', 'feature/index.ts'],
    ['./feature.helpers', 'feature.helpers/index.tsx'],
  ])('resolves %s to %s', async (specifier, target) => {
    const source = join(root, 'consumer.ts');
    const resolvedPath = join(root, target);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, 'export {};');
    writeFileSync(source, `import '${specifier}';`);

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toEqual([
      {
        sourceFile: source,
        rawSpecifier: specifier,
        resolvedPath,
        kind: 'static',
      },
    ]);
  });

  it('preserves a dotted basename when a shorter sibling also exists', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "import './feature.helpers';");
    writeFileSync(join(root, 'feature.ts'), 'export {};');
    writeFileSync(join(root, 'feature.helpers.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([{ resolvedPath: join(root, 'feature.helpers.ts') }]);
  });

  it('does not resolve a missing dotted basename to a shorter sibling', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "export * from './feature.helpers';");
    writeFileSync(join(root, 'feature.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([
      {
        rawSpecifier: './feature.helpers',
        resolvedPath: null,
        kind: 're-export',
      },
    ]);
  });

  it('prefers an existing exact path over source extension substitution', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "import './feature.js';");
    writeFileSync(join(root, 'feature.js'), 'export {};');
    writeFileSync(join(root, 'feature.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([{ resolvedPath: join(root, 'feature.js') }]);
  });

  it('carries the 1-based line of an indeterminate reference', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.tsx');
    writeFileSync(
      source,
      "const first = 1;\nconst s = <p>Don't</p>; import('./a.ts');\n",
    );

    expect(
      (await ecmascriptStructureAdapter.extractDependencies(source)).map(
        ({ rawSpecifier, certainty, line }) => ({
          rawSpecifier,
          certainty,
          line,
        }),
      ),
    ).toEqual([
      { rawSpecifier: './a.ts', certainty: 'indeterminate', line: 2 },
    ]);
  });

  it('omits line on an exact reference', async () => {
    writeFileSync(join(root, 'a.ts'), 'export const a = 1;');
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "import { a } from './a.ts';\n");

    const [reference] =
      await ecmascriptStructureAdapter.extractDependencies(source);
    expect(reference.line).toBeUndefined();
  });
});
