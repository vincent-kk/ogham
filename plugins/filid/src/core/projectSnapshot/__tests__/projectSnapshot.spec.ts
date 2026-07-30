// filid:contract AC-snapshot-consistency
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  portableDirname as dirname,
  portableJoin as join,
} from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../../adapters/index.js';
import type {
  StructureAdapter,
  VerificationAdapter,
} from '../../../types/adapters.js';
import { createDefaultConfig } from '../../infra/configLoader/index.js';
import { computeSnapshotHash, createProjectSnapshot } from '../index.js';

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-project-snapshot-'));
  roots.push(root);
  return root;
}

function write(root: string, relativePath: string, content: string): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

function intent(name: string): string {
  return [
    `# ${name}`,
    '## Purpose',
    `Own ${name}.`,
    '## Structure',
    'The module entry point declares the public surface.',
    '## Conventions',
    'Prefer exact evidence.',
    '## Boundaries',
    '### Always do',
    '- Preserve the contract.',
    '### Ask first',
    '- Ask before changing the public boundary.',
    '### Never do',
    '- Never hide uncertainty.',
    '## Dependencies',
    '- None.',
  ].join('\n');
}

function detail(name: string): string {
  return [
    `# ${name} contract`,
    '## Requirements',
    `- ${name} remains observable.`,
    '## API Contracts',
    `- ${name} exposes one stable value.`,
    '## Acceptance Criteria',
    `### AC-${name} — stable evidence`,
    '- The public value is available.',
    '## Last Updated',
    '2026-07-27',
  ].join('\n');
}

function verificationAdapter(
  id: string,
  filePath: string,
): VerificationAdapter {
  return {
    id,
    async detect() {
      return { confidence: 0.8, evidence: [filePath] };
    },
    async discover() {
      return [filePath];
    },
    async classify() {
      return 'spec-document';
    },
    async count() {
      return {
        certainty: 'exact',
        exactCount: 1,
        knownLowerBound: 1,
        reasons: [],
      };
    },
    async extractContractGroupIds() {
      return [];
    },
  };
}

function writeSnapshotProject(root: string): {
  consumer: string;
  producer: string;
  verificationFile: string;
} {
  write(root, 'INTENT.md', intent('root'));
  write(root, 'DETAIL.md', detail('root'));
  write(root, 'index.ts', "export { value } from './producer/index.js';");
  const producer = join(root, 'producer');
  write(root, 'producer/INTENT.md', intent('producer'));
  write(root, 'producer/DETAIL.md', detail('producer'));
  write(root, 'producer/index.ts', "export { value } from './value.js';");
  write(root, 'producer/value.ts', 'export const value = 1;');
  const verificationFile = write(
    root,
    'producer/value.spec.ts',
    "describe('value', () => { it('is stable', () => {}); });",
  );
  const consumer = join(root, 'consumer');
  write(root, 'consumer/INTENT.md', intent('consumer'));
  write(root, 'consumer/DETAIL.md', detail('consumer'));
  write(root, 'consumer/index.ts', "export { doubled } from './doubled.js';");
  write(
    root,
    'consumer/doubled.ts',
    "import { value } from '../producer/index.js';\nexport const doubled = value * 2;",
  );
  return { consumer, producer, verificationFile };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('project snapshot', () => {
  it('bundles one tree, owner graph, and verification analysis', async () => {
    const root = project();
    const fixture = writeSnapshotProject(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      projectRoot: root,
      outputLanguage: 'Korean',
      adapterIds: ['ecmascript'],
    });
    expect(snapshot.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.tree.nodes.has(fixture.consumer)).toBe(true);
    expect(snapshot.tree.nodes.has(fixture.producer)).toBe(true);
    expect(snapshot.dependencyGraph.edges).toContainEqual(
      expect.objectContaining({
        fromFractalPath: fixture.consumer,
        toFractalPath: fixture.producer,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            rawSpecifier: '../producer/index.js',
            resolvedPath: join(fixture.producer, 'index.ts'),
          }),
        ]),
      }),
    );
    expect(snapshot.verification.files).toContainEqual(
      expect.objectContaining({
        path: fixture.verificationFile,
        role: 'spec-document',
        ownerFractalPath: fixture.producer,
      }),
    );
  });

  it('keeps the config output language in the snapshot', async () => {
    const root = project();
    writeSnapshotProject(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('한국어'),
    );

    expect(snapshot.outputLanguage).toBe('한국어');
  });

  it('changes the hash when file content changes', async () => {
    const root = project();
    const file = write(root, 'module/value.ts', 'export const value = 1;');
    const before = await computeSnapshotHash(root, [file]);

    writeFileSync(file, 'export const value = 2;', 'utf8');

    expect(await computeSnapshotHash(root, [file])).not.toBe(before);
  });

  it('keeps the hash when only file mtime changes', async () => {
    const root = project();
    const file = write(root, 'module/value.ts', 'export const value = 1;');
    const before = await computeSnapshotHash(root, [file]);

    const later = new Date(Date.now() + 60_000);
    utimesSync(file, later, later);

    expect(await computeSnapshotHash(root, [file])).toBe(before);
  });

  it('hashes files independently of caller ordering', async () => {
    const root = project();
    const first = write(root, 'module/a.ts', 'export const a = 1;');
    const second = write(root, 'module/b.ts', 'export const b = 2;');

    expect(await computeSnapshotHash(root, [second, first])).toBe(
      await computeSnapshotHash(root, [first, second]),
    );
  });

  it('keeps the hash for equivalent projects at different absolute roots', async () => {
    const firstRoot = project();
    const secondRoot = project();
    writeSnapshotProject(firstRoot);
    writeSnapshotProject(secondRoot);
    const registry = createAdapterRegistry();
    const config = createDefaultConfig('Korean');

    const first = await createProjectSnapshot(firstRoot, registry, config);
    const second = await createProjectSnapshot(secondRoot, registry, config);

    expect(first.projectRoot).toBe(firstRoot);
    expect(second.projectRoot).toBe(secondRoot);
    expect(first.snapshotHash).toBe(second.snapshotHash);
  });

  it('reports an explicitly requested unknown adapter as a snapshot diagnostic', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean', ['missing-adapter']),
    );

    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unknown-adapter-id',
        message: expect.stringContaining('missing-adapter'),
      }),
    );
    expect(snapshot.adapterIds).toEqual([]);
    expect.soft(snapshot.dependencyGraph.certainty).toBe('unsupported');
    expect.soft(snapshot.verification.certainty).toBe('unsupported');
  });

  it('does not choose an arbitrary verification owner for equal-confidence claims', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const verificationFile = write(root, 'contract.verify', 'opaque');
    const registry = createAdapterRegistry({
      structure: [],
      verification: [
        verificationAdapter('first', verificationFile),
        verificationAdapter('second', verificationFile),
      ],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean'),
    );

    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ambiguous-adapter-claim',
        path: verificationFile,
      }),
    );
    expect(snapshot.verification.files).not.toContainEqual(
      expect.objectContaining({ path: verificationFile }),
    );
    expect(snapshot.verification.certainty).toBe('indeterminate');
  });

  it('normalizes and deduplicates verification discovery paths', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const verificationFile = write(root, 'contract.verify', 'opaque');
    const duplicate = verificationAdapter('only', verificationFile);
    duplicate.discover = async () => [verificationFile, verificationFile];
    const registry = createAdapterRegistry({
      structure: [],
      verification: [duplicate],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean'),
    );

    expect(snapshot.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'ambiguous-adapter-claim' }),
    );
    expect(snapshot.verification.files).toHaveLength(1);
    expect(snapshot.verification.files[0]?.path).toBe(verificationFile);
  });

  it('treats relative and absolute verification claims as the same portable path', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const verificationFile = write(root, 'contract.verify', 'opaque');
    const registry = createAdapterRegistry({
      structure: [],
      verification: [
        verificationAdapter('absolute', verificationFile),
        verificationAdapter('relative', 'contract.verify'),
      ],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean'),
    );

    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ambiguous-adapter-claim',
        path: verificationFile,
      }),
    );
    expect(snapshot.verification.files).toEqual([]);
    expect(snapshot.verification.certainty).toBe('indeterminate');
  });

  it('discovers each verification adapter only once per snapshot', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const verificationFile = write(root, 'contract.verify', 'opaque');
    let detectionCalls = 0;
    let discoveryCalls = 0;
    const adapter = verificationAdapter('single-pass', verificationFile);
    adapter.detect = async () => {
      detectionCalls++;
      return { confidence: 0.8, evidence: [verificationFile] };
    };
    adapter.discover = async () => {
      discoveryCalls++;
      if (discoveryCalls > 1) throw new Error('verification rediscovered');
      return [verificationFile];
    };
    const registry = createAdapterRegistry({
      structure: [],
      verification: [adapter],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean'),
    );

    expect(detectionCalls).toBe(1);
    expect(discoveryCalls).toBe(1);
    expect(snapshot.verification.files).toContainEqual(
      expect.objectContaining({ path: verificationFile }),
    );
  });

  it('preserves verification discovery failure as indeterminate evidence', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const adapter = verificationAdapter(
      'failing-discovery',
      join(root, 'contract.verify'),
    );
    adapter.discover = async () => {
      throw new Error('verification discovery failed');
    };
    const registry = createAdapterRegistry({
      structure: [],
      verification: [adapter],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean'),
    );

    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'verification-discovery-failed',
        message: 'verification discovery failed',
      }),
    );
    expect(snapshot.verification.certainty).toBe('indeterminate');
  });

  it('passes entry point overrides only to their structure adapter', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const entryPath = write(root, 'custom.entry', 'public surface');
    let receivedOverrides: readonly string[] | undefined;
    const adapter: StructureAdapter = {
      id: 'custom-structure',
      async detect() {
        return { confidence: 1, evidence: [entryPath] };
      },
      async discoverSourceFiles() {
        return [entryPath];
      },
      async findEntryPoints(_directoryPath, overrides) {
        receivedOverrides = overrides;
        return overrides?.includes('custom.entry')
          ? [
              {
                path: entryPath,
                kind: 'module',
                adapterId: 'custom-structure',
                surface: 'enumerated',
              },
            ]
          : [];
      },
      async inspectEntryPoint(entryPointPath) {
        return {
          entryPoint: {
            path: entryPointPath,
            kind: 'module',
            adapterId: 'custom-structure',
            surface: 'enumerated',
          },
          exportedNames: ['value'],
          hasDirectDeclarations: false,
          certainty: 'exact',
        };
      },
      async extractDependencies() {
        return [];
      },
      async isFrameworkOwnedPeer() {
        return false;
      },
      async suggestEntryPointPath(directoryPath) {
        return join(directoryPath, 'custom.entry');
      },
    };
    const config = createDefaultConfig('Korean', ['custom-structure']);
    config.structure = {
      entryPointOverrides: { 'custom-structure': ['custom.entry'] },
    };

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry({ structure: [adapter], verification: [] }),
      config,
    );

    expect(receivedOverrides).toEqual(['custom.entry']);
    expect(snapshot.tree.nodes.get(root)?.entryPoints).toContainEqual(
      expect.objectContaining({ path: entryPath }),
    );
  });

  it('excludes ambiguous structure ownership from tree entry evidence', async () => {
    const root = project();
    write(root, 'INTENT.md', intent('root'));
    write(root, 'DETAIL.md', detail('root'));
    const entryPath = write(root, 'contract.entry', 'public surface');
    const detectionCalls = new Map<string, number>();
    const adapter = (id: string): StructureAdapter => ({
      id,
      async detect() {
        detectionCalls.set(id, (detectionCalls.get(id) ?? 0) + 1);
        return { confidence: 0.9, evidence: [entryPath] };
      },
      async discoverSourceFiles() {
        return [entryPath];
      },
      async findEntryPoints() {
        return [
          {
            path: entryPath,
            kind: 'module',
            adapterId: id,
            surface: 'enumerated',
          },
        ];
      },
      async inspectEntryPoint(entryPointPath) {
        return {
          entryPoint: {
            path: entryPointPath,
            kind: 'module',
            adapterId: id,
            surface: 'enumerated',
          },
          exportedNames: ['value'],
          hasDirectDeclarations: false,
          certainty: 'exact',
        };
      },
      async extractDependencies() {
        return [];
      },
      async isFrameworkOwnedPeer() {
        return false;
      },
      async suggestEntryPointPath(directoryPath) {
        return join(directoryPath, 'contract.entry');
      },
    });
    const registry = createAdapterRegistry({
      structure: [adapter('first'), adapter('second')],
      verification: [],
    });

    const snapshot = await createProjectSnapshot(
      root,
      registry,
      createDefaultConfig('Korean', ['first', 'second']),
    );

    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ambiguous-adapter-claim',
        path: entryPath,
      }),
    );
    expect(snapshot.tree.nodes.get(root)?.entryPoints).toEqual([]);
    expect(detectionCalls).toEqual(
      new Map([
        ['first', 1],
        ['second', 1],
      ]),
    );
  });
});
