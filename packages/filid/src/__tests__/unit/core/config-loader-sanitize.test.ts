/**
 * @file config-loader-sanitize.test.ts
 * @description Commit C behaviour — strict zod validation + strict-sanitize
 * fallback. Covers AC1 (nested unknown key), AC10b (invalid exempt glob),
 * and the pre-mortem-2 bare `**` exempt drop.
 */
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../../../core/infra/config-loader/config-loader.js';

function writeRaw(root: string, raw: unknown): void {
  const dir = join(root, '.filid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(raw), 'utf8');
}

describe('config-loader sanitize (Commit C)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-sanitize-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('basic', () => {
    it('AC1: nested additional-allowed under rules[x] → warn + dropped', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            severity: 'warning',
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).not.toBeNull();
      expect(
        warnings.some((w) => w.includes('additional-allowed')),
      ).toBe(true);
      expect(
        'additional-allowed' in (config?.rules['zero-peer-file'] ?? {}),
      ).toBe(false);
    });

    it('AC10b: invalid exempt glob → warn + pattern dropped', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'module-entry-point': {
            enabled: true,
            exempt: ['[invalid', 'packages/**'],
          },
        },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).not.toBeNull();
      expect(config?.rules['module-entry-point']?.exempt).toEqual([
        'packages/**',
      ]);
      expect(
        warnings.some(
          (w) => w.includes('invalid glob syntax') && w.includes('[invalid'),
        ),
      ).toBe(true);
    });

    it('pre-mortem-2: bare "**" exempt pattern dropped at load time', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            exempt: ['**', 'packages/legacy/**'],
          },
        },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config?.rules['zero-peer-file']?.exempt).toEqual([
        'packages/legacy/**',
      ]);
      expect(
        warnings.some(
          (w) => w.includes('bare "**"') || w.includes('concrete scope'),
        ),
      ).toBe(true);
    });
  });

  describe('edge', () => {
    it('multiple unknown top-level keys produce multiple warnings, all dropped', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {},
        bogus: 1,
        also_bogus: 2,
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).not.toBeNull();
      expect('bogus' in (config ?? {})).toBe(false);
      expect('also_bogus' in (config ?? {})).toBe(false);
      expect(warnings.filter((w) => w.includes('(dropped'))).toHaveLength(2);
    });

    it('invalid severity enum value is dropped (leaf drop)', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'naming-convention': { enabled: true, severity: 'CRITICAL' },
        },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config?.rules['naming-convention']).toEqual({ enabled: true });
      expect(warnings.some((w) => w.includes('severity'))).toBe(true);
    });

    it('AC-Obs: log.warn spy set equals warnings array (order-preserving)', async () => {
      const logger = await import('../../../lib/logger.js');
      const createLoggerSpy = vi.spyOn(logger, 'createLogger');
      void createLoggerSpy; // kept for diagnostic; actual assertion below uses the real logger
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
      // Spy on console.error because log.warn emits via console.error with the tag
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { warnings } = loadConfig(tmpDir);
      const configWarnLines = consoleErrorSpy.mock.calls
        .filter((call) => call.some((arg) => String(arg).includes('[filid:config-loader]')))
        .map((call) => call.slice(1).map((a) => String(a)).join(' '));
      // Every warning message must appear in console.error output with the
      // config-loader tag, preserving order.
      expect(warnings.length).toBeGreaterThan(0);
      for (let i = 0; i < warnings.length; i++) {
        expect(configWarnLines[i]).toContain(warnings[i]);
      }
    });

    it('valid config passes zod strict cleanly with empty warnings', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'naming-convention': { enabled: true, severity: 'warning' },
        },
        'additional-allowed': [
          'type.ts',
          { basename: 'CLAUDE.md', paths: ['packages/**'] },
        ],
        scan: { maxDepth: 8 },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).not.toBeNull();
      expect(warnings).toEqual([]);
    });

    it('invalid JSON returns null config with a warning', () => {
      mkdirSync(join(tmpDir, '.filid'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.filid', 'config.json'),
        'not-json',
        'utf8',
      );
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).toBeNull();
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('missing config returns null config with empty warnings', () => {
      const { config, warnings } = loadConfig(tmpDir);
      expect(config).toBeNull();
      expect(warnings).toEqual([]);
    });

    it('exempt glob dry-validation: only obviously broken patterns are dropped', () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'module-entry-point': {
            enabled: true,
            exempt: ['packages/**', 'src/legacy/**', 'literal/path.ts'],
          },
        },
      });
      const { config, warnings } = loadConfig(tmpDir);
      expect(config?.rules['module-entry-point']?.exempt).toEqual([
        'packages/**',
        'src/legacy/**',
        'literal/path.ts',
      ]);
      expect(warnings).toEqual([]);
    });
  });
});
