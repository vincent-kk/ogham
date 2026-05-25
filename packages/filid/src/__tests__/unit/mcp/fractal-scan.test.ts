import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleFractalScan } from '../../../mcp/tools/fractal-scan/fractal-scan.js';

vi.mock('@ogham/cross-platform/spawn', async () => {
  const actual = await vi.importActual<
    typeof import('@ogham/cross-platform/spawn')
  >('@ogham/cross-platform/spawn');
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

describe('fractal-scan tool — DTO shape', () => {
  it('should expose tree.nodes as a flat array', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    expect(result.tree).toBeDefined();
    expect(Array.isArray(result.tree.nodes)).toBe(true);
    expect(result.tree.nodes.length).toBeGreaterThan(0);
  });

  it('should NOT serialize tree.nodes as a Map', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    // DTO uses an array; in-process FractalTree (Map) is not exposed.
    expect(result.tree.nodes).not.toBeInstanceOf(Map);
  });

  it('should preserve totalNodes parity with nodes.length', async () => {
    const result = await handleFractalScan({ path: import.meta.dirname });

    expect(result.tree.nodes.length).toBe(result.tree.totalNodes);
  });
});

describe('fractal-scan tool — maxDepth resolution priority', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = join(
      tmpdir(),
      `filid-fractal-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    // Build a synthetic project with nested fractal dirs to exercise depth.
    //   tmpRoot/
    //     INTENT.md                 (depth 0)
    //     index.ts
    //     a/INTENT.md + a/index.ts  (depth 1)
    //       a/b/INTENT.md + a/b/index.ts (depth 2)
    //         a/b/c/INTENT.md + a/b/c/index.ts (depth 3)
    const nested = join(tmpRoot, 'a', 'b', 'c');
    mkdirSync(nested, { recursive: true });
    for (const dir of [
      tmpRoot,
      join(tmpRoot, 'a'),
      join(tmpRoot, 'a', 'b'),
      nested,
    ]) {
      writeFileSync(join(dir, 'INTENT.md'), '# x', 'utf8');
      writeFileSync(join(dir, 'index.ts'), 'export {};\n', 'utf8');
    }
    // Pretend tmpRoot is its own git repo root for loadConfig's resolveGitRoot.
    mockedSpawnCliSync.mockImplementation((bin, args) => {
      if (bin === 'git' && [...args].includes('rev-parse')) {
        return {
          code: 0,
          stdout: tmpRoot + '\n',
          stderr: '',
          timedOut: false,
        };
      }
      return {
        code: 1,
        stdout: '',
        stderr: 'unexpected command',
        timedOut: false,
        spawnError: new Error('unexpected command'),
      };
    });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeScanConfig(maxDepth: number | null): void {
    const dir = join(tmpRoot, '.filid');
    mkdirSync(dir, { recursive: true });
    const body =
      maxDepth === null
        ? { version: '1.0', rules: {} }
        : { version: '1.0', rules: {}, scan: { maxDepth } };
    writeFileSync(join(dir, 'config.json'), JSON.stringify(body), 'utf8');
  }

  it('input.depth takes precedence over config.scan.maxDepth', async () => {
    writeScanConfig(3);
    const result = await handleFractalScan({ path: tmpRoot, depth: 1 });
    // With depth=1, nodes at depth 2 and 3 must not appear.
    for (const node of result.tree.nodes) {
      expect(node.depth).toBeLessThanOrEqual(1);
    }
  });

  it('config.scan.maxDepth is used when input.depth is omitted', async () => {
    writeScanConfig(1);
    const result = await handleFractalScan({ path: tmpRoot });
    for (const node of result.tree.nodes) {
      expect(node.depth).toBeLessThanOrEqual(1);
    }
  });

  it('falls back to default (10) when neither is set', async () => {
    writeScanConfig(null);
    const result = await handleFractalScan({ path: tmpRoot });
    // All 4 nested dirs (depths 0..3) should fit under the default cap.
    const depths = result.tree.nodes.map((n) => n.depth);
    expect(Math.max(...depths)).toBeGreaterThanOrEqual(3);
  });
});
