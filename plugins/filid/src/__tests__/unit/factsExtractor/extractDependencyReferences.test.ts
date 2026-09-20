import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractDependencyReferences } from '../../../factsExtractor/analysis/references/extractDependencyReferences.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-dependency-resolution-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

/**
 * Write a file under the case's project root.
 * @param relativePath Path relative to the root.
 * @param content File body.
 * @returns The absolute path written.
 */
function writeIn(relativePath: string, content = ''): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}


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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      (await extractDependencyReferences(source)).map(
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
      await extractDependencyReferences(source),
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
      await extractDependencyReferences(source),
    ).toMatchObject([{ resolvedPath: join(root, 'feature.helpers.ts') }]);
  });

  it('does not resolve a missing dotted basename to a shorter sibling', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "export * from './feature.helpers';");
    writeFileSync(join(root, 'feature.ts'), 'export {};');

    expect(
      await extractDependencyReferences(source),
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
      await extractDependencyReferences(source),
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
      (await extractDependencyReferences(source)).map(
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
      await extractDependencyReferences(source);
    expect(reference.line).toBeUndefined();
  });
});


describe('what the scan reads as a dependency and what it does not', () => {
  it('extracts real dependencies but ignores comments and string contents', async () => {
    const target = writeIn('src/target.ts', 'export const value = 1;');
    const source = writeIn(
      'src/source.ts',
      [
        "// import './comment-only.js';",
        'const sample = "require(\'./string-only.js\')";',
        "import { value } from './target.js';",
        "export { value as forwarded } from './target.js';",
      ].join('\n'),
    );

    const dependencies =
      await extractDependencyReferences(source);

    expect(dependencies).toHaveLength(2);
    expect(dependencies.map((item) => item.resolvedPath)).toEqual([
      target,
      target,
    ]);
  });

  it('skips external packages but preserves unresolved project-local dependencies', async () => {
    const source = writeIn(
      'src/source.ts',
      [
        "import { library } from 'external-package';",
        "import { missing } from './missing.js';",
      ].join('\n'),
    );

    expect(
      await extractDependencyReferences(source),
    ).toEqual([
      expect.objectContaining({
        rawSpecifier: './missing.js',
        resolvedPath: null,
      }),
    ]);
  });

  it('does not read import.meta path arithmetic as a dependency', async () => {
    const source = writeIn(
      'src/source.ts',
      [
        "import { dirname } from 'node:path';",
        "import { fileURLToPath } from 'node:url';",
        '',
        "const packageRoot = dirname(fileURLToPath(import.meta.url)) + '/../..';",
        'export { packageRoot };',
      ].join('\n'),
    );

    expect(
      await extractDependencyReferences(source),
    ).toEqual([]);
  });

  it('does not read an identifier named from inside an exported function as a re-export', async () => {
    const source = writeIn(
      'src/source.ts',
      [
        'export const assertSafeFromPointer = (from: string): string[] => {',
        "  const segments = from.split('/');",
        '  return segments;',
        '};',
      ].join('\n'),
    );

    expect(
      await extractDependencyReferences(source),
    ).toEqual([]);
  });

  it('extracts star, namespace and type-only re-export sources', async () => {
    const target = writeIn('src/target.ts', 'export const value = 1;');
    const source = writeIn(
      'src/source.ts',
      [
        "export * from './target.js';",
        "export * as forwarded from './target.js';",
        "export type { Value } from './target.js';",
      ].join('\n'),
    );

    const dependencies =
      await extractDependencyReferences(source);

    expect(dependencies.map((item) => item.resolvedPath)).toEqual([
      target,
      target,
      target,
    ]);
    expect(dependencies.map((item) => item.kind)).toEqual([
      're-export',
      're-export',
      're-export',
    ]);
  });

  it('extracts dependencies that follow a regex literal holding quotes', async () => {
    writeIn('src/a.ts', 'export const a = 1;');
    writeIn('src/b.ts', 'export const b = 2;');
    const source = writeIn(
      'src/source.ts',
      [
        "import { a } from './a.ts';",
        'export const Q = /["\']/;',
        "export { b } from './b.ts';",
        "export const lazy = () => import('./a.ts');",
      ].join('\n'),
    );

    const dependencies =
      await extractDependencyReferences(source);

    expect(dependencies.map((item) => item.rawSpecifier)).toEqual([
      './a.ts',
      './b.ts',
      './a.ts',
    ]);
    expect(dependencies.map((item) => item.kind)).toEqual([
      'static',
      're-export',
      'dynamic',
    ]);
  });
});
