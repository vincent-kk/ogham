import { describe, expect, it } from 'vitest';

import { handleFractalScan } from '../../../mcp/tools/fractal-scan/fractal-scan.js';

describe('fractal-scan tool — nodesList', () => {
  it('should include nodesList as an array in the scan result', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    expect(result.tree).toBeDefined();
    expect(result.tree.nodesList).toBeDefined();
    expect(Array.isArray(result.tree.nodesList)).toBe(true);
  });

  it('should have nodesList length equal to nodes.size', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    expect(result.tree.nodesList!.length).toBe(result.tree.nodes.size);
  });

  it('should keep nodes as a Map instance', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    expect(result.tree.nodes).toBeInstanceOf(Map);
  });
});
