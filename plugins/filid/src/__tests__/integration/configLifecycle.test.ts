/**
 * @file configLifecycle.test.ts
 * @description AC-E2E coverage for the 2026-04-24 no-op-config incident §9.
 *
 * Uses a real `git init`-ed tmpdir (no execSync mock) to exercise the full
 * lifecycle `loadConfig` → `scanProject` → `validateStructure` via
 * `handleStructureValidate`. Asserts that (a) the legacy nested
 * `additional-allowed` shape no longer silently clears the peer-file
 * violation, AND (b) the `configWarnings` array surfaces the drop so the
 * Phase D chairperson and CI have the observable evidence they need.
 *
 * Companion control case verifies the top-level `additional-allowed` shape
 * still exempts the peer file correctly — waiver mechanism intact.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/paths';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SNAPSHOT_TOOL_DIAGNOSTIC_CODES } from '../../constants/mcpContracts.js';
import { handleStructureValidate } from '../../mcp/tools/structureValidate/index.js';
import type {
  StructureValidateData,
  ValidationReport,
} from '../../types/report.js';
import type { ToolDiagnostic } from '../../types/toolEnvelope.js';

interface ZpfScenarioFiles {
  config: Record<string, unknown>;
}

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

function setupFractalRepo(repoDir: string, files: ZpfScenarioFiles): string {
  mkdirSync(portableJoin(repoDir, '.filid'), { recursive: true });
  writeFileSync(
    portableJoin(repoDir, '.filid', 'config.json'),
    JSON.stringify(files.config, null, 2),
    'utf8',
  );

  const moduleDir = portableJoin(repoDir, 'my-module');
  mkdirSync(moduleDir, { recursive: true });
  writeFileSync(
    portableJoin(moduleDir, 'INTENT.md'),
    '## Purpose\n\ntest fixture for AC-E2E.\n',
    'utf8',
  );
  writeFileSync(
    portableJoin(moduleDir, 'index.ts'),
    'export const x = 1;\n',
    'utf8',
  );
  writeFileSync(
    portableJoin(moduleDir, 'CLAUDE.md'),
    '# CLAUDE.md peer\n',
    'utf8',
  );
  return moduleDir;
}

describe('config lifecycle (incident §9 AC-E2E)', () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = portableJoin(
      tmpdir(),
      `filid-e2e-config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(repoDir, { recursive: true });
    // A real, self-contained git repo so resolveGitRoot does not walk up
    // into the outer ogham monorepo.
    execSync('git init --quiet', { cwd: repoDir });
    execSync('git config user.email "e2e@filid.test"', { cwd: repoDir });
    execSync('git config user.name "filid e2e"', { cwd: repoDir });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('nested additional-allowed is dropped AND peer-file violation surfaces', async () => {
    setupFractalRepo(repoDir, {
      config: {
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            severity: 'warning',
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      },
    });

    const result = await handleStructureValidate({ path: repoDir });
    const configWarnings = getConfigWarnings(result.diagnostics);
    const report = getValidationReport(result.data);

    // (a) Loud-drop: nested key reported via configWarnings
    expect(
      configWarnings.some((warning) => warning.includes('additional-allowed')),
    ).toBe(true);

    // (b) Peer-file violation still surfaces — nested waiver had zero effect.
    //     The config did NOT suppress the warning; this is the structural
    //     guarantee that the no-op-config class of failures cannot recur.
    const zpfViolations = report.result.violations.filter(
      (v) => v.ruleId === 'zero-peer-file' && v.message.includes('CLAUDE.md'),
    );
    expect(zpfViolations.length).toBeGreaterThan(0);
  });

  it('top-level additional-allowed exempts the peer file (control)', async () => {
    setupFractalRepo(repoDir, {
      config: {
        version: '1.0',
        rules: {
          'zero-peer-file': { enabled: true, severity: 'warning' },
        },
        'additional-allowed': ['CLAUDE.md'],
      },
    });

    const result = await handleStructureValidate({ path: repoDir });
    const configWarnings = getConfigWarnings(result.diagnostics);
    const report = getValidationReport(result.data);

    // Strict schema accepts this shape — no warnings.
    expect(configWarnings).toEqual([]);

    // CLAUDE.md allowed → no peer-file violation mentioning it on my-module.
    const zpfViolations = report.result.violations.filter(
      (v) =>
        v.ruleId === 'zero-peer-file' &&
        v.path.endsWith('my-module') &&
        v.message.includes('CLAUDE.md'),
    );
    expect(zpfViolations).toHaveLength(0);
  });
});
