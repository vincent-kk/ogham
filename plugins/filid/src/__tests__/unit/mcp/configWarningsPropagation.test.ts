/**
 * @file configWarningsPropagation.test.ts
 * @description AC11 + AC-Obs coverage, plus config→rule-set propagation.
 *   - AC11: unknown-key config → structure-validate / rule-query /
 *     drift-detect responses all include `configWarnings[]` with matching
 *     messages.
 *   - AC-Obs: log.warn (via console.error) emits the same message set in the
 *     same order as the returned `configWarnings` array.
 *   - Rule set: drift-detect must evaluate the SAME configured rules as
 *     structure-validate, not the unconfigured defaults.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/paths';
import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { SNAPSHOT_TOOL_DIAGNOSTIC_CODES } from '../../../constants/mcpContracts.js';
import { handleDriftDetect } from '../../../mcp/tools/driftDetect/driftDetect.js';
import { handleRuleQuery } from '../../../mcp/tools/ruleQuery/ruleQuery.js';
import { handleStructureValidate } from '../../../mcp/tools/structureValidate/structureValidate.js';
import type {
  StructureValidateData,
  ValidationReport,
} from '../../../types/report.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

vi.mock('@ogham/cross-platform/spawn', async () => {
  const actual = await vi.importActual<
    typeof import('@ogham/cross-platform/spawn')
  >('@ogham/cross-platform/spawn');
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);
const PEER_FIXTURE_DIRECTORY = 'peer-fixture';
const PEER_FIXTURE_FILE = 'unexpected.txt';

function getConfigWarnings(diagnostics: ToolDiagnostic[]): string[] {
  return diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.code === SNAPSHOT_TOOL_DIAGNOSTIC_CODES.CONFIG_WARNING,
    )
    .map((diagnostic) => diagnostic.message);
}

function getValidationReport(
  data: StructureValidateData | undefined,
): ValidationReport {
  if (!data || !('result' in data))
    throw new Error('expected project validation report');
  return data;
}

function writeRaw(root: string, raw: unknown): void {
  const dir = portableJoin(root, '.filid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(portableJoin(dir, 'config.json'), JSON.stringify(raw), 'utf8');
}

function writePeerViolationFixture(root: string): void {
  const modulePath = portableJoin(root, PEER_FIXTURE_DIRECTORY);
  mkdirSync(modulePath, { recursive: true });
  writeFileSync(
    portableJoin(modulePath, 'INTENT.md'),
    '# peer fixture\n',
    'utf8',
  );
  writeFileSync(portableJoin(modulePath, 'index.ts'), 'export {};\n', 'utf8');
  writeFileSync(portableJoin(modulePath, PEER_FIXTURE_FILE), 'peer\n', 'utf8');
}

describe('configWarnings propagation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = portableJoin(
      tmpdir(),
      `filid-warnings-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    // Pretend tmpDir is its own git root so loadConfig's resolveGitRoot cache
    // hits this path instead of walking upward.
    mockedSpawnCliSync.mockImplementation((bin, args) => {
      if (bin === 'git' && [...args].includes('rev-parse'))
        return {
          code: 0,
          stdout: tmpDir + '\n',
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
      const configWarnings = getConfigWarnings(result.diagnostics);
      expect(Array.isArray(configWarnings)).toBe(true);
      expect(configWarnings.length).toBeGreaterThan(0);
      expect(
        configWarnings.some((warning) =>
          warning.includes('additional-allowed'),
        ),
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

  describe('rule set propagation', () => {
    it('drift-detect honours rule overrides from config', async () => {
      writePeerViolationFixture(tmpDir);

      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: {
            enabled: true,
            severity: 'warning',
          },
        },
      });
      const enabled = await handleDriftDetect({ path: tmpDir });
      expect(
        enabled.items.some(
          (item) => item.rule === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
        ),
      ).toBe(true);

      // Disabling it must silence the drift item too. drift-detect used to call
      // validateStructure() with no rules, which falls back to the unconfigured
      // builtin set — so it reported violations the project had exempted.
      writeRaw(tmpDir, {
        version: '1.0',
        rules: { [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: { enabled: false } },
      });
      const disabled = await handleDriftDetect({ path: tmpDir });
      expect(
        disabled.items.some(
          (item) => item.rule === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
        ),
      ).toBe(false);
    });

    it('drift-detect and structure-validate agree on the configured rule set', async () => {
      writePeerViolationFixture(tmpDir);

      writeRaw(tmpDir, {
        version: '1.0',
        rules: { [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: { enabled: false } },
      });

      const validated = await handleStructureValidate({ path: tmpDir });
      const drifted = await handleDriftDetect({ path: tmpDir });
      const report = getValidationReport(validated.data);

      expect(
        report.result.violations.some(
          (violation) => violation.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
        ),
      ).toBe(false);
      expect(
        drifted.items.some(
          (item) => item.rule === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
        ),
      ).toBe(false);
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
        .map((call) =>
          call
            .slice(1)
            .map((a) => String(a))
            .join(' '),
        );
      const configWarnings = getConfigWarnings(result.diagnostics);
      expect(configWarnings.length).toBeGreaterThan(0);
      // Each warning appears in log.warn output; order preserved.
      for (let i = 0; i < configWarnings.length; i++)
        expect(configLoaderLines[i]).toContain(configWarnings[i]);
    });

    it('empty warnings when config is strictly valid', async () => {
      writeRaw(tmpDir, {
        version: '1.0',
        rules: {
          'naming-convention': { enabled: true, severity: 'warning' },
        },
      });
      const r1 = await handleStructureValidate({ path: tmpDir });
      expect(getConfigWarnings(r1.diagnostics)).toEqual([]);
      const r2 = await handleDriftDetect({ path: tmpDir });
      expect(r2.configWarnings).toEqual([]);
    });

    it('empty warnings when config is missing', async () => {
      const result = await handleStructureValidate({ path: tmpDir });
      expect(getConfigWarnings(result.diagnostics)).toEqual([]);
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
      const configWarnings = getConfigWarnings(result.diagnostics);
      expect(
        configWarnings.some((warning) =>
          warning.includes('invalid glob syntax'),
        ),
      ).toBe(true);
    });
  });
});
