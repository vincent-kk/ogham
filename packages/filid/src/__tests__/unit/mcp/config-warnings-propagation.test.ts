/**
 * @file config-warnings-propagation.test.ts
 * @description AC11 + AC-Obs coverage.
 *   - AC11: unknown-key config → structure-validate / rule-query /
 *     drift-detect responses all include `configWarnings[]` with matching
 *     messages.
 *   - AC-Obs: log.warn (via console.error) emits the same message set in the
 *     same order as the returned `configWarnings` array.
 */
import { execSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleDriftDetect } from '../../../mcp/tools/drift-detect/drift-detect.js';
import { handleRuleQuery } from '../../../mcp/tools/rule-query/rule-query.js';
import { handleStructureValidate } from '../../../mcp/tools/structure-validate/structure-validate.js';

vi.mock('node:child_process', async () => {
  const actual =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    );
  return { ...actual, execSync: vi.fn(actual.execSync) };
});

const mockedExecSync = vi.mocked(execSync);

function writeRaw(root: string, raw: unknown): void {
  const dir = join(root, '.filid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(raw), 'utf8');
}

describe('configWarnings propagation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-warnings-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    // Pretend tmpDir is its own git root so loadConfig's resolveGitRoot cache
    // hits this path instead of walking upward.
    mockedExecSync.mockImplementation(((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse'))
        return tmpDir + '\n';
      throw new Error('unexpected command');
    }) as typeof execSync);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('basic', () => {
    it('AC11: structure-validate surfaces configWarnings', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      });
      const result = await handleStructureValidate({ path: tmpDir });
      expect(Array.isArray(result.configWarnings)).toBe(true);
      expect(result.configWarnings.length).toBeGreaterThan(0);
      expect(
        result.configWarnings.some((w) => w.includes('additional-allowed')),
      ).toBe(true);
    });

    it('AC11: rule-query list surfaces configWarnings', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      });
      const result = await handleRuleQuery({
        action: 'list',
        path: tmpDir,
      });
      expect('configWarnings' in result).toBe(true);
      const withWarnings = result as { configWarnings: string[] };
      expect(withWarnings.configWarnings.length).toBeGreaterThan(0);
    });

    it('AC11: drift-detect surfaces configWarnings', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      });
      const result = await handleDriftDetect({ path: tmpDir });
      expect(Array.isArray(result.configWarnings)).toBe(true);
      expect(result.configWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('edge', () => {
    it('AC-Obs: log.warn output matches configWarnings order', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            'additional-allowed': ['CLAUDE.md'],
          },
          'module-entry-point': {
            enabled: true,
            exempt: ['**'],
          },
        },
      });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const result = await handleStructureValidate({ path: tmpDir });
      const configLoaderLines = consoleErrorSpy.mock.calls
        .filter((call) =>
          call.some((arg) => String(arg).includes('[filid:config-loader]')),
        )
        .map((call) => call.slice(1).map((a) => String(a)).join(' '));
      expect(result.configWarnings.length).toBeGreaterThan(0);
      // Each warning appears in log.warn output; order preserved.
      for (let i = 0; i < result.configWarnings.length; i++) {
        expect(configLoaderLines[i]).toContain(result.configWarnings[i]);
      }
    });

    it('empty warnings when config is strictly valid', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'naming-convention': { enabled: true, severity: 'warning' },
        },
      });
      const r1 = await handleStructureValidate({ path: tmpDir });
      expect(r1.configWarnings).toEqual([]);
      const r2 = await handleDriftDetect({ path: tmpDir });
      expect(r2.configWarnings).toEqual([]);
    });

    it('empty warnings when config is missing', async () => {
      const result = await handleStructureValidate({ path: tmpDir });
      expect(result.configWarnings).toEqual([]);
    });

    it('invalid exempt glob is warned and dropped, surfaces to tool response', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'module-entry-point': {
            enabled: true,
            exempt: ['[invalid', 'packages/**'],
          },
        },
      });
      const result = await handleStructureValidate({ path: tmpDir });
      expect(
        result.configWarnings.some((w) =>
          w.includes('invalid glob syntax'),
        ),
      ).toBe(true);
    });
  });
});
