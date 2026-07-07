import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildScanResult,
  handleFractalScan,
} from '../../../mcp/tools/fractalScan/index.js';
import type { ScanReportDto, ScanResultDto } from '../../../types/report.js';

/** Narrow the outputMode union to the full report (default mode in tests). */
function asReport(result: ScanResultDto): ScanReportDto {
  if (!('tree' in result))
    throw new Error(
      `expected full ScanReportDto, got: ${JSON.stringify(result).slice(0, 120)}`,
    );
  return result;
}

vi.mock('@ogham/cross-platform/spawn', async () => {
  const actual = await vi.importActual<
    typeof import('@ogham/cross-platform/spawn')
  >('@ogham/cross-platform/spawn');
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

describe('fractal-scan tool — DTO shape', () => {
  it('should expose tree.nodes as a flat array', async () => {
    const result = asReport(
      await handleFractalScan({ path: import.meta.dirname }),
    );

    expect(result.tree).toBeDefined();
    expect(Array.isArray(result.tree.nodes)).toBe(true);
    expect(result.tree.nodes.length).toBeGreaterThan(0);
  });

  it('should NOT serialize tree.nodes as a Map', async () => {
    const result = asReport(
      await handleFractalScan({ path: import.meta.dirname }),
    );

    // DTO uses an array; in-process FractalTree (Map) is not exposed.
    expect(result.tree.nodes).not.toBeInstanceOf(Map);
  });

  it('should preserve totalNodes parity with nodes.length', async () => {
    const result = asReport(
      await handleFractalScan({ path: import.meta.dirname }),
    );

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
      if (bin === 'git' && [...args].includes('rev-parse'))
        return {
          code: 0,
          stdout: tmpRoot + '\n',
          stderr: '',
          timedOut: false,
        };

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
    mockedSpawnCliSync.mockReset();
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
    const result = asReport(
      await handleFractalScan({ path: tmpRoot, depth: 1 }),
    );
    // With depth=1, nodes at depth 2 and 3 must not appear.
    for (const node of result.tree.nodes)
      expect(node.depth).toBeLessThanOrEqual(1);
  });

  it('config.scan.maxDepth is used when input.depth is omitted', async () => {
    writeScanConfig(1);
    const result = asReport(await handleFractalScan({ path: tmpRoot }));
    for (const node of result.tree.nodes)
      expect(node.depth).toBeLessThanOrEqual(1);
  });

  it('falls back to default (10) when neither is set', async () => {
    writeScanConfig(null);
    const result = asReport(await handleFractalScan({ path: tmpRoot }));
    // All 4 nested dirs (depths 0..3) should fit under the default cap.
    const depths = result.tree.nodes.map((n) => n.depth);
    expect(Math.max(...depths)).toBeGreaterThanOrEqual(3);
  });
});

describe('fractal-scan tool — output modes & size guard', () => {
  let tmpConfig: string;

  beforeEach(() => {
    tmpConfig = join(
      tmpdir(),
      `filid-scan-mode-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpConfig, { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = tmpConfig;
  });

  afterEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR;
    rmSync(tmpConfig, { recursive: true, force: true });
  });

  it('summary mode returns counts without a nodes payload', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      outputMode: 'summary',
    });
    expect(result).toMatchObject({ outputMode: 'summary' });
    expect(result).not.toHaveProperty('nodes');
    expect(result).not.toHaveProperty('tree');
    if (result.outputMode === 'summary') {
      expect(result.totalNodes).toBeGreaterThan(0);
      expect(Object.keys(result.nodesByType).length).toBeGreaterThan(0);
    }
  });

  it('paths mode projects nodes down to path/type/INTENT flags', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      outputMode: 'paths',
    });
    if (result.outputMode !== 'paths' || !('nodes' in result))
      throw new Error('expected paths projection');
    expect(result.nodes.length).toBe(result.totalNodes);
    expect(Object.keys(result.nodes[0]).sort()).toEqual([
      'hasDetailMd',
      'hasIntentMd',
      'path',
      'type',
    ]);
  });

  it('oversized payloads degrade to a { truncated, reportPath, summary } envelope', () => {
    const report: ScanReportDto = {
      tree: {
        root: '/proj',
        depth: 1,
        totalNodes: 2,
        nodes: [
          {
            path: '/proj',
            name: 'proj',
            type: 'fractal',
            parent: null,
            children: [],
            organs: [],
            hasIntentMd: true,
            hasDetailMd: false,
            hasIndex: true,
            hasMain: false,
            depth: 0,
          },
          {
            path: '/proj/src',
            name: 'src',
            type: 'fractal',
            parent: '/proj',
            children: [],
            organs: [],
            hasIntentMd: false,
            hasDetailMd: false,
            hasIndex: true,
            hasMain: false,
            depth: 1,
          },
        ],
      },
      modules: [],
      timestamp: '2026-07-07T00:00:00.000Z',
      duration: 1,
    };

    const result = buildScanResult(report, 'full', 10, '/proj');
    if (!('truncated' in result)) throw new Error('expected truncation');
    expect(result.truncated).toBe(true);
    expect(result.summary.totalNodes).toBe(2);
    expect(result.summary.missingIntentFractals).toBe(1);
    const saved = JSON.parse(readFileSync(result.reportPath, 'utf-8'));
    expect(saved.tree.totalNodes).toBe(2);
  });
});
