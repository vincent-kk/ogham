import { describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/index.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import type { StructureAdapter } from '../../../types/adapters.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import { collectEntryPointSurfaces } from '../evidence/collectEntryPointSurfaces.js';

const ENTRY = '/root/index.ts';

const failingStructureAdapter: StructureAdapter = {
  ...ecmascriptStructureAdapter,
  id: 'fixture',
  async inspectEntryPoint() {
    throw new Error('permission denied');
  },
};

describe('snapshot evidence collectors name what failed', () => {
  it('names the entry point it could not inspect', async () => {
    const tree = buildFractalTree([
      {
        path: '/root',
        name: 'root',
        type: NODE_TYPES.FRACTAL,
        hasIntentMd: true,
        hasDetailMd: true,
        peerFiles: ['index.ts', 'INTENT.md', 'DETAIL.md'],
        entryPoints: [
          {
            path: ENTRY,
            kind: 'module',
            adapterId: 'fixture',
            surface: 'enumerated',
          },
        ],
      },
    ]);

    const { diagnostics } = await collectEntryPointSurfaces(tree, [
      failingStructureAdapter,
    ]);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'entry-point-inspection-failed',
        message: `Could not inspect entry point ${ENTRY}: permission denied`,
      }),
    );
  });
});
