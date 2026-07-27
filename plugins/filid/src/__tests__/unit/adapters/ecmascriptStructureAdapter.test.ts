import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-ecmascript-'));
  roots.push(root);
  return root;
}

function write(root: string, relativePath: string, content = ''): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('ecmascript structure adapter', () => {
  it('claims a project with supported source evidence', async () => {
    const root = project();
    write(root, 'src/start.ts', 'export const start = true;');

    const claim = await ecmascriptStructureAdapter.detect(root);

    expect(claim.confidence).toBeGreaterThan(0);
    expect(claim.evidence.some((item) => item.includes('start.ts'))).toBe(true);
  });

  it('does not claim a project containing only unknown files', async () => {
    const root = project();
    write(root, 'notes/contract.unknown', 'opaque');

    expect(await ecmascriptStructureAdapter.detect(root)).toEqual({
      confidence: 0,
      evidence: [],
    });
  });

  it('discovers supported source files without descending excluded dirs', async () => {
    const root = project();
    const source = write(root, 'src/feature.ts', 'export {};');
    write(root, 'node_modules/pkg/index.js', 'export {};');
    write(root, 'src/readme.md', '# docs');

    expect(await ecmascriptStructureAdapter.discoverSourceFiles(root)).toEqual([
      source,
    ]);
  });

  it('reports module and executable entry points with exact paths', async () => {
    const root = project();
    const modulePath = write(root, 'module/index.ts', 'export {};');
    const executablePath = write(root, 'module/main.js', 'run();');

    const entries = await ecmascriptStructureAdapter.findEntryPoints(
      join(root, 'module'),
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: modulePath, kind: 'module' }),
        expect.objectContaining({ path: executablePath, kind: 'executable' }),
      ]),
    );
  });

  it('interprets only exact configured peer names as entry overrides', async () => {
    const root = project();
    const configured = write(root, 'module/public.ts', 'export {};');
    write(root, 'module/public-extra.ts', 'export {};');
    const directory = join(root, 'module');

    expect(await ecmascriptStructureAdapter.findEntryPoints(directory)).toEqual(
      [],
    );
    expect(
      await ecmascriptStructureAdapter.findEntryPoints(directory, [
        'public.ts',
      ]),
    ).toEqual([expect.objectContaining({ path: configured, kind: 'module' })]);
  });

  it('reports framework-owned entry points from package evidence', async () => {
    const root = project();
    write(
      root,
      'package.json',
      JSON.stringify({ dependencies: { next: 'latest' } }),
    );
    const pagePath = write(
      root,
      'app/page.tsx',
      'export default function P(){}',
    );

    const entries = await ecmascriptStructureAdapter.findEntryPoints(
      join(root, 'app'),
    );

    expect(entries).toContainEqual(
      expect.objectContaining({ path: pagePath, kind: 'framework' }),
    );
  });

  it('extracts real dependencies but ignores comments and string contents', async () => {
    const root = project();
    const target = write(root, 'src/target.ts', 'export const value = 1;');
    const source = write(
      root,
      'src/source.ts',
      [
        "// import './comment-only.js';",
        'const sample = "require(\'./string-only.js\')";',
        "import { value } from './target.js';",
        "export { value as forwarded } from './target.js';",
      ].join('\n'),
    );

    const dependencies =
      await ecmascriptStructureAdapter.extractDependencies(source);

    expect(dependencies).toHaveLength(2);
    expect(dependencies.map((item) => item.resolvedPath)).toEqual([
      target,
      target,
    ]);
  });

  it('skips external packages but preserves unresolved project-local dependencies', async () => {
    const root = project();
    const source = write(
      root,
      'src/source.ts',
      [
        "import { library } from 'external-package';",
        "import { missing } from './missing.js';",
      ].join('\n'),
    );

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toEqual([
      expect.objectContaining({
        rawSpecifier: './missing.js',
        resolvedPath: null,
      }),
    ]);
  });

  it('enumerates named exports and detects direct declarations', async () => {
    const root = project();
    const entry = write(
      root,
      'src/index.ts',
      [
        "export { value } from './value.js';",
        'export const direct = 1;',
        'export type PublicShape = { value: number };',
      ].join('\n'),
    );

    const inspection =
      await ecmascriptStructureAdapter.inspectEntryPoint(entry);

    expect(inspection.exportedNames).toEqual(
      expect.arrayContaining(['value', 'direct', 'PublicShape']),
    );
    expect(inspection.hasDirectDeclarations).toBe(true);
    expect(inspection.certainty).toBe('exact');
  });
});
