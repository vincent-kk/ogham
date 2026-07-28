import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/paths';
import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRACTAL_SCAN_DETAILS } from '../../../constants/mcpContracts.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../constants/scanDefaults.js';
import { handleFractalScan } from '../../../mcp/tools/fractalScan/index.js';
import type {
  FractalScanData,
  FractalScanFullData,
  FractalScanPathsData,
  FractalScanSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

const CONFIG_VERSION = '1.0';
const INTENT_FILE_NAME = 'INTENT.md';
const ENTRY_POINT_FILE_NAME = 'index.ts';
const CONFIG_DIRECTORY_NAME = '.filid';
const CONFIG_FILE_NAME = 'config.json';

function getFullData(
  result: ToolPayload<FractalScanSummary, FractalScanData>,
): FractalScanFullData {
  if (!result.data || !('snapshot' in result.data))
    throw new Error('expected full fractal scan data');
  return result.data as FractalScanFullData;
}

function getPathsData(
  result: ToolPayload<FractalScanSummary, FractalScanData>,
): FractalScanPathsData {
  if (!result.data || !('nodes' in result.data))
    throw new Error('expected paths fractal scan data');
  return result.data as FractalScanPathsData;
}

vi.mock('@ogham/cross-platform/spawn', async () => {
  const actual = await vi.importActual<
    typeof import('@ogham/cross-platform/spawn')
  >('@ogham/cross-platform/spawn');
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

describe('fractal-scan tool — DTO shape', () => {
  it('should expose full tree.nodes as a flat array', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const { tree } = getFullData(result).snapshot;

    expect(Array.isArray(tree.nodes)).toBe(true);
    expect(tree.nodes.length).toBeGreaterThan(0);
  });

  it('should NOT serialize full tree.nodes as a Map', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });

    expect(getFullData(result).snapshot.tree.nodes).not.toBeInstanceOf(Map);
  });

  it('should preserve totalNodes parity with nodes.length', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const { tree } = getFullData(result).snapshot;

    expect(tree.nodes.length).toBe(tree.totalNodes);
  });
});

describe('fractal-scan tool — maxDepth resolution priority', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = portableJoin(
      tmpdir(),
      `filid-fractal-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    const nested = portableJoin(tmpRoot, 'a', 'b', 'c');
    const fixtureDirectories = [
      tmpRoot,
      portableJoin(tmpRoot, 'a'),
      portableJoin(tmpRoot, 'a', 'b'),
      nested,
    ];
    mkdirSync(nested, { recursive: true });
    for (const directory of fixtureDirectories) {
      writeFileSync(portableJoin(directory, INTENT_FILE_NAME), '# x', 'utf8');
      writeFileSync(
        portableJoin(directory, ENTRY_POINT_FILE_NAME),
        'export {};\n',
        'utf8',
      );
    }
    mockedSpawnCliSync.mockImplementation((bin, args) => {
      if (bin === 'git' && [...args].includes('rev-parse'))
        return {
          code: 0,
          stdout: `${tmpRoot}\n`,
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
    const directory = portableJoin(tmpRoot, CONFIG_DIRECTORY_NAME);
    mkdirSync(directory, { recursive: true });
    const body =
      maxDepth === null
        ? { version: CONFIG_VERSION, rules: {} }
        : {
            version: CONFIG_VERSION,
            rules: {},
            scan: { maxDepth },
          };
    writeFileSync(
      portableJoin(directory, CONFIG_FILE_NAME),
      JSON.stringify(body),
      'utf8',
    );
  }

  it('input.maxDepth takes precedence over config.scan.maxDepth', async () => {
    writeScanConfig(3);
    const result = await handleFractalScan({
      path: tmpRoot,
      maxDepth: 1,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const data = getFullData(result);

    expect(data.validation.scanOptions?.maxDepth).toBe(1);
    // The threshold moved; the tree did not. maxDepth is not a traversal limit.
    expect(data.snapshot.tree.depth).toBeGreaterThan(1);
  });

  it('config.scan.maxDepth is used when input.maxDepth is omitted', async () => {
    writeScanConfig(1);
    const result = await handleFractalScan({
      path: tmpRoot,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const data = getFullData(result);

    expect(data.validation.scanOptions?.maxDepth).toBe(1);
    expect(data.snapshot.tree.depth).toBeGreaterThan(1);
  });

  it('falls back to default when neither is set', async () => {
    writeScanConfig(null);
    const result = await handleFractalScan({
      path: tmpRoot,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const data = getFullData(result);

    expect(data.validation.scanOptions?.maxDepth).toBe(
      DEFAULT_SCAN_OPTIONS.maxDepth,
    );
    expect(data.snapshot.tree.depth).toBeGreaterThanOrEqual(3);
  });
});

describe('fractal-scan tool — detail projections', () => {
  it('summary detail returns counts without a nodes payload', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.SUMMARY,
    });

    expect(result.data).toBeUndefined();
    expect(result.summary.totalNodes).toBeGreaterThan(0);
    expect(Object.keys(result.summary.nodesByType).length).toBeGreaterThan(0);
  });

  it('paths detail projects node identity and boundary flags', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.PATHS,
    });
    const data = getPathsData(result);

    expect(data.nodes.length).toBe(result.summary.totalNodes);
    expect(Object.keys(data.nodes[0]).sort()).toEqual([
      'entryPointCount',
      'hasDetailMd',
      'hasIntentMd',
      'path',
      'type',
    ]);
  });

  it('full detail uses the common payload without a scan-specific report path', async () => {
    const result = await handleFractalScan({
      path: import.meta.dirname,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });
    const data = getFullData(result);

    expect(data.snapshot.tree.totalNodes).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('reportPath');
    expect(result).not.toHaveProperty('truncated');
  });
});

describe('fractal-scan tool — additional-organ-names wiring', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = portableJoin(
      tmpdir(),
      `filid-organ-names-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(portableJoin(tmpRoot, 'skills', 'preview'), {
      recursive: true,
    });
    writeFileSync(portableJoin(tmpRoot, INTENT_FILE_NAME), '# root', 'utf8');
    // A module index makes `skills` a fractal on structure alone, so the
    // config-supplied organ name has something to override. Without it the
    // directory is already an organ and the two cases stop discriminating.
    writeFileSync(
      portableJoin(tmpRoot, 'skills', 'index.ts'),
      'export {};\n',
      'utf8',
    );
    writeFileSync(
      portableJoin(tmpRoot, 'skills', 'preview', 'SKILL.md'),
      '# preview',
      'utf8',
    );
    mockedSpawnCliSync.mockImplementation((bin, args) => {
      if (bin === 'git' && [...args].includes('rev-parse'))
        return {
          code: 0,
          stdout: `${tmpRoot}\n`,
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

  function writeOrganNamesConfig(names: string[] | null): void {
    const directory = portableJoin(tmpRoot, CONFIG_DIRECTORY_NAME);
    mkdirSync(directory, { recursive: true });
    const body =
      names === null
        ? { version: CONFIG_VERSION, rules: {} }
        : {
            version: CONFIG_VERSION,
            rules: {},
            'additional-organ-names': names,
          };
    writeFileSync(
      portableJoin(directory, CONFIG_FILE_NAME),
      JSON.stringify(body),
      'utf8',
    );
  }

  function typeOf(result: FractalScanFullData, relativePath: string) {
    const targetPath = portableJoin(tmpRoot, relativePath);
    return result.snapshot.tree.nodes.find((node) => node.path === targetPath)
      ?.type;
  }

  it('config names reach classifyNode through migrated config', async () => {
    writeOrganNamesConfig(['skills']);
    const result = await handleFractalScan({
      path: tmpRoot,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });

    expect(typeOf(getFullData(result), 'skills')).toBe(NODE_TYPES.ORGAN);
  });

  it('without the key the same directory stays fractal', async () => {
    writeOrganNamesConfig(null);
    const result = await handleFractalScan({
      path: tmpRoot,
      detail: FRACTAL_SCAN_DETAILS.FULL,
    });

    expect(typeOf(getFullData(result), 'skills')).toBe(NODE_TYPES.FRACTAL);
  });
});
