/**
 * @file config-lifecycle.test.ts
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
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleStructureValidate } from '../../mcp/tools/structure-validate/structure-validate.js';

interface ZpfScenarioFiles {
  config: Record<string, unknown>;
}

function setupFractalRepo(
  repoDir: string,
  files: ZpfScenarioFiles,
): string {
  mkdirSync(join(repoDir, '.filid'), { recursive: true });
  writeFileSync(
    join(repoDir, '.filid', 'config.json'),
    JSON.stringify(files.config, null, 2),
    'utf8',
  );

  const moduleDir = join(repoDir, 'my-module');
  mkdirSync(moduleDir, { recursive: true });
  writeFileSync(
    join(moduleDir, 'INTENT.md'),
    '## Purpose\n\ntest fixture for AC-E2E.\n',
    'utf8',
  );
  writeFileSync(
    join(moduleDir, 'index.ts'),
    'export const x = 1;\n',
    'utf8',
  );
  writeFileSync(join(moduleDir, 'CLAUDE.md'), '# CLAUDE.md peer\n', 'utf8');
  return moduleDir;
}

describe('config lifecycle (incident §9 AC-E2E)', () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = join(
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

    // (a) Loud-drop: nested key reported via configWarnings
    expect(
      result.configWarnings.some((w) => w.includes('additional-allowed')),
    ).toBe(true);

    // (b) Peer-file violation still surfaces — nested waiver had zero effect.
    //     The config did NOT suppress the warning; this is the structural
    //     guarantee that the no-op-config class of failures cannot recur.
    const zpfViolations = result.report.result.violations.filter(
      (v) =>
        v.ruleId === 'zero-peer-file' && v.message.includes('CLAUDE.md'),
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

    // Strict schema accepts this shape — no warnings.
    expect(result.configWarnings).toEqual([]);

    // CLAUDE.md allowed → no peer-file violation mentioning it on my-module.
    const zpfViolations = result.report.result.violations.filter(
      (v) =>
        v.ruleId === 'zero-peer-file' &&
        v.path.endsWith('my-module') &&
        v.message.includes('CLAUDE.md'),
    );
    expect(zpfViolations).toHaveLength(0);
  });
});
