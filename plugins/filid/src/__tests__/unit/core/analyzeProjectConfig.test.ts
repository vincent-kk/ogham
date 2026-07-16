/**
 * @file analyzeProjectConfig.test.ts
 * @description analyzeProject 가 `.filid/config.json` 의 룰셋으로 검증하는지
 * 고정한다. 룰 없이 validateStructure 를 부르면 미설정 기본 룰셋으로 폴백해
 * 프로젝트가 명시적으로 끈 규칙이 violations · healthScore 에 새어 든다
 * (drift_detect 에서 실측된 결함과 동일 계열).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analyzeProject } from '../../../core/analysis/projectAnalyzer/projectAnalyzer.js';

vi.mock('@ogham/cross-platform/spawn', async () => {
  const actual = await vi.importActual<
    typeof import('@ogham/cross-platform/spawn')
  >('@ogham/cross-platform/spawn');
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

function writeConfig(root: string, raw: unknown): void {
  const dir = join(root, '.filid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(raw), 'utf8');
}

describe('analyzeProject config awareness', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-analyze-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    // snake_case fractal dir — a naming-convention violation when enabled.
    mkdirSync(join(tmpDir, 'bad_name'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'bad_name', 'INTENT.md'),
      '# bad_name\n',
      'utf8',
    );
    // Pretend tmpDir is its own git root so loadConfig resolves here.
    mockedSpawnCliSync.mockImplementation((bin, args) => {
      if (bin === 'git' && [...args].includes('rev-parse'))
        return { code: 0, stdout: tmpDir + '\n', stderr: '', timedOut: false };

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

  it('reports the violation while the rule is enabled', async () => {
    writeConfig(tmpDir, {
      version: '1.0',
      rules: { 'naming-convention': { enabled: true, severity: 'warning' } },
    });
    const report = await analyzeProject(tmpDir, { detailed: false });
    expect(
      report.validation.result.violations.some(
        (v) => v.ruleId === 'naming-convention',
      ),
    ).toBe(true);
  });

  it('honours a disabled rule instead of falling back to defaults', async () => {
    writeConfig(tmpDir, {
      version: '1.0',
      rules: { 'naming-convention': { enabled: false } },
    });
    const report = await analyzeProject(tmpDir, { detailed: false });
    expect(
      report.validation.result.violations.some(
        (v) => v.ruleId === 'naming-convention',
      ),
    ).toBe(false);
  });
});
