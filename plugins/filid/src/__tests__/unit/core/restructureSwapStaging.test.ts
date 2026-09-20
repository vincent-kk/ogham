import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { handleRestructure } from '../../../mcp/tools/restructure/index.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';

/** Temporary project removed after each case. */
let projectRoot: string | undefined;

afterEach(() => {
  if (projectRoot) rmSync(projectRoot, { recursive: true, force: true });
  projectRoot = undefined;
});

describe('a swap stages through organNameHint for a fractal target too', () => {
  it('places an independent unit under the temporary name as a fractal without a decision', async () => {
    projectRoot = writeSharedUnitRestructureProject();
    const plan = await handleRestructure({
      action: 'plan',
      path: projectRoot,
      requests: [
        {
          sourcePath: join(projectRoot, 'domain/a/value.ts'),
          consumerPaths: [
            join(projectRoot, 'domain/a/use.ts'),
            join(projectRoot, 'domain/b/use.ts'),
          ],
          contractIntent: 'independent',
          organNameHint: 'staging',
        },
      ],
    });
    expect(plan.data).toMatchObject({
      unresolved: [],
      moves: [
        {
          targetPath: join(projectRoot, 'domain/staging/value.ts'),
          targetNodeType: 'fractal',
        },
      ],
    });
  });
});
