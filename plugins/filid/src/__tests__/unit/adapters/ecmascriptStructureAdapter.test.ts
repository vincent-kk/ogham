import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform';
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

  it('discovers a force-added source file but not a git-ignored one', async () => {
    const root = project();
    const tracked = write(root, 'generated/pinned.ts', 'export {};');
    write(root, 'generated/output.ts', 'export {};');
    write(root, '.gitignore', 'generated/\n');
    spawnCliSync('git', ['init', '--quiet'], { cwd: root });
    spawnCliSync('git', ['add', '-f', 'generated/pinned.ts'], { cwd: root });

    expect(await ecmascriptStructureAdapter.discoverSourceFiles(root)).toEqual([
      tracked,
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

  it('reports the directory own package.json as a manifest entry point', async () => {
    const root = project();
    const manifest = write(
      root,
      'package.json',
      JSON.stringify({
        name: 'demo',
        exports: { '.': './dist/index.js', './guard': './dist/guard.js' },
      }),
    );

    const entryPoints = await ecmascriptStructureAdapter.findEntryPoints(root);

    expect(entryPoints).toEqual([
      expect.objectContaining({
        path: manifest,
        kind: 'manifest',
        surface: 'enumerated',
      }),
    ]);
  });

  it('does not report an ancestor package.json as this directory manifest', async () => {
    const root = project();
    write(root, 'package.json', JSON.stringify({ name: 'demo' }));
    write(root, 'src/index.ts', 'export const value = 1;');

    const entryPoints = await ecmascriptStructureAdapter.findEntryPoints(
      join(root, 'src'),
    );

    expect(entryPoints.map(({ kind }) => kind)).toEqual(['module']);
  });

  it('inspects a manifest surface through its exports map', async () => {
    const root = project();
    const manifest = write(
      root,
      'package.json',
      JSON.stringify({
        name: 'demo',
        main: './dist/index.js',
        exports: { './guard': './dist/guard.js', '.': './dist/index.js' },
      }),
    );

    const inspection =
      await ecmascriptStructureAdapter.inspectEntryPoint(manifest);

    expect(inspection.exportedNames).toEqual(['.', './guard']);
    expect(inspection.certainty).toBe('exact');
    expect(inspection.hasDirectDeclarations).toBe(false);
  });

  it('falls back to a single manifest entry when only main is declared', async () => {
    const root = project();
    const manifest = write(
      root,
      'package.json',
      JSON.stringify({ name: 'demo', main: 'dist/index.js' }),
    );

    const inspection =
      await ecmascriptStructureAdapter.inspectEntryPoint(manifest);

    expect(inspection.exportedNames).toEqual(['.']);
    expect(inspection.certainty).toBe('exact');
  });

  it('reports an empty exact surface for a manifest declaring none', async () => {
    const root = project();
    const manifest = write(
      root,
      'package.json',
      JSON.stringify({ name: 'demo', private: true }),
    );

    const inspection =
      await ecmascriptStructureAdapter.inspectEntryPoint(manifest);

    expect(inspection.exportedNames).toEqual([]);
    expect(inspection.certainty).toBe('exact');
  });

  it('reports an indeterminate surface for an unreadable manifest', async () => {
    const root = project();
    const manifest = write(root, 'package.json', '{ not json');

    const inspection =
      await ecmascriptStructureAdapter.inspectEntryPoint(manifest);

    expect(inspection.exportedNames).toEqual([]);
    expect(inspection.certainty).toBe('indeterminate');
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
    ).toEqual([
      expect.objectContaining({ path: configured, kind: 'executable' }),
    ]);
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

  it('does not read import.meta path arithmetic as a dependency', async () => {
    const root = project();
    const source = write(
      root,
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
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toEqual([]);
  });

  it('does not read an identifier named from inside an exported function as a re-export', async () => {
    const root = project();
    const source = write(
      root,
      'src/source.ts',
      [
        'export const assertSafeFromPointer = (from: string): string[] => {',
        "  const segments = from.split('/');",
        '  return segments;',
        '};',
      ].join('\n'),
    );

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toEqual([]);
  });

  it('extracts star, namespace and type-only re-export sources', async () => {
    const root = project();
    const target = write(root, 'src/target.ts', 'export const value = 1;');
    const source = write(
      root,
      'src/source.ts',
      [
        "export * from './target.js';",
        "export * as forwarded from './target.js';",
        "export type { Value } from './target.js';",
      ].join('\n'),
    );

    const dependencies =
      await ecmascriptStructureAdapter.extractDependencies(source);

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

  it('reports a config-injected entry override as a non-module kind', async () => {
    const root = project();
    write(root, 'surface.ts', 'export const surface = true;');

    const entries = await ecmascriptStructureAdapter.findEntryPoints(root, [
      'surface.ts',
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).not.toBe('module');
    expect(entries[0].surface).toBe('enumerated');
  });

  it('still reports a recognized module index as a module entry', async () => {
    const root = project();
    write(root, 'index.ts', 'export const value = true;');

    const entries = await ecmascriptStructureAdapter.findEntryPoints(root, [
      'surface.ts',
    ]);

    expect(entries.map((entry) => entry.kind)).toEqual(['module']);
  });
});
