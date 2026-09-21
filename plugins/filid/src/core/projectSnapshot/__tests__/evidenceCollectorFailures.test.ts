import { describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/index.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import type { StructureAdapter } from '../../../types/adapters.js';
import type { EntryPointDescriptor } from '../../../types/fractal.js';
import {
  resolveFactsScope,
  resolveFactsStorePaths,
} from '../../facts/index.js';
import type { FactsFileState, ProjectFacts } from '../../facts/index.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import { collectEntryPointSurfaces } from '../evidence/collectEntryPointSurfaces.js';

const MANIFEST = '/root/package.json';
const MODULE_ENTRY = '/root/index.ts';

const failingStructureAdapter: StructureAdapter = {
  ...ecmascriptStructureAdapter,
  id: 'fixture',
  async inspectEntryPoint() {
    throw new Error('permission denied');
  },
};

/** A store that holds nothing, which is what an unbootstrapped project has. */
const EMPTY_FACTS: ProjectFacts = {
  scope: resolveFactsScope(),
  scannedPaths: [],
  scannedSet: new Set(),
  storePaths: resolveFactsStorePaths('/root'),
  records: new Map(),
  shards: new Map(),
  epoch: {
    resolutionEpoch: 'sha256:epoch',
    scannedPaths: [],
    resolutionInputs: [],
  },
  adjudications: new Map(),
  damagedJudgementShards: new Map(),
  judgementsDirectoryUnreadable: false,
  pending: new Map(),
};

/**
 * A one-node tree whose root fractal declares one entry point.
 * @param entryPoint Descriptor the node publishes.
 * @returns The tree the collector walks.
 */
function treeWith(entryPoint: EntryPointDescriptor) {
  return buildFractalTree([
    {
      path: '/root',
      name: 'root',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: true,
      peerFiles: ['index.ts', 'package.json', 'INTENT.md', 'DETAIL.md'],
      entryPoints: [entryPoint],
    },
  ]);
}

describe('snapshot evidence collectors name what failed', () => {
  it('names the manifest entry point it could not read', async () => {
    const tree = treeWith({
      path: MANIFEST,
      kind: 'manifest',
      adapterId: 'fixture',
      surface: 'enumerated',
    });

    const { diagnostics } = await collectEntryPointSurfaces(
      tree,
      [failingStructureAdapter],
      EMPTY_FACTS,
      new Map<string, FactsFileState>(),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'entry-point-inspection-failed',
        message: `Could not read the manifest ${MANIFEST}: permission denied`,
      }),
    );
  });

  it('names the entry point no record describes', async () => {
    const tree = treeWith({
      path: MODULE_ENTRY,
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    });

    const { diagnostics } = await collectEntryPointSurfaces(
      tree,
      [failingStructureAdapter],
      EMPTY_FACTS,
      new Map<string, FactsFileState>(),
    );

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'entry-point-facts-unavailable',
        path: MODULE_ENTRY,
        affects: ['boundaries'],
      }),
    );
    expect(
      tree.nodes.get('/root')?.entryPointSurfaces?.map((s) => s.certainty),
    ).toEqual(['indeterminate']);
  });
});
