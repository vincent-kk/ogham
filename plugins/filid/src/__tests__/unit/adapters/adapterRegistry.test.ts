import { portableJoin } from '@ogham/cross-platform/paths';
import { describe, expect, it } from 'vitest';

import {
  createAdapterRegistry,
  resolveAdapters,
} from '../../../adapters/index.js';
import type {
  AdapterClaim,
  EntryPointInspection,
  StructureAdapter,
} from '../../../types/adapters.js';

function structureAdapter(
  id: string,
  confidence: number,
  files: string[],
): StructureAdapter {
  return {
    id,
    async detect(): Promise<AdapterClaim> {
      return { confidence, evidence: [`${id}:${confidence}`] };
    },
    async discoverSourceFiles(): Promise<string[]> {
      return files;
    },
    async findEntryPoints(): Promise<[]> {
      return [];
    },
    async inspectEntryPoint(): Promise<EntryPointInspection> {
      throw new Error('not used by registry tests');
    },
    async extractDependencies(): Promise<[]> {
      return [];
    },
    async isFrameworkOwnedPeer(): Promise<boolean> {
      return false;
    },
    async suggestEntryPointPath(directoryPath): Promise<string> {
      return portableJoin(directoryPath, `${id}.entry`);
    },
  };
}

describe('adapter registry', () => {
  it('registers the initial verification adapter by default', async () => {
    const resolved = await createAdapterRegistry().resolveVerification(
      import.meta.dirname,
    );

    expect(resolved.map((adapter) => adapter.id)).toEqual(['ecmascript']);
  });

  it('resolves registered structure adapters by descending confidence', async () => {
    const registry = createAdapterRegistry({
      structure: [
        structureAdapter('low', 0.4, []),
        structureAdapter('high', 0.9, []),
      ],
    });

    const resolved = await registry.resolveStructure('/project');

    expect(resolved.map((adapter) => adapter.id)).toEqual(['high', 'low']);
  });

  it('rejects duplicate adapter IDs at registration', () => {
    const registry = createAdapterRegistry({
      structure: [structureAdapter('same', 1, [])],
    });

    expect(() =>
      registry.registerStructure(structureAdapter('same', 0.5, [])),
    ).toThrow(/same/);
  });

  it('reports an unowned requested file as unsupported', async () => {
    const filePath = '/project/unknown.source';
    const result = await resolveAdapters(
      '/project',
      [structureAdapter('known', 1, ['/project/known.source'])],
      [filePath],
    );

    expect(result.ownership.has(filePath)).toBe(false);
    expect(result.unsupportedPaths).toEqual([filePath]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unsupported', path: filePath }),
    );
  });

  it('reports equal-confidence ownership as ambiguous-adapter-claim', async () => {
    const filePath = '/project/shared.source';
    const result = await resolveAdapters(
      '/project',
      [
        structureAdapter('first', 0.8, [filePath]),
        structureAdapter('second', 0.8, [filePath]),
      ],
      [filePath],
    );

    expect(result.ownership.has(filePath)).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ambiguous-adapter-claim',
        path: filePath,
        adapterIds: ['first', 'second'],
      }),
    );
  });

  it('selects the higher-confidence owner and preserves claim evidence', async () => {
    const filePath = '/project/owned.source';
    const result = await resolveAdapters(
      '/project',
      [
        structureAdapter('secondary', 0.4, [filePath]),
        structureAdapter('primary', 0.9, [filePath]),
      ],
      [filePath],
    );

    expect(result.ownership.get(filePath)?.adapter.id).toBe('primary');
    expect(result.ownership.get(filePath)?.claim.evidence).toEqual([
      'primary:0.9',
    ]);
  });

  it('treats Windows case and separator aliases as one requested path', async () => {
    const root = String.raw`C:\Project`;
    const ownedPath = String.raw`C:\Project\Feature\source.any`;
    const requestedAlias = 'c:/project/feature/source.any';

    const result = await resolveAdapters(
      root,
      [structureAdapter('portable', 1, [ownedPath])],
      [requestedAlias],
    );

    expect(result.ownership).toHaveLength(1);
    expect(result.unsupportedPaths).toEqual([]);
    expect([...result.ownership.values()][0]?.adapter.id).toBe('portable');
  });
});
