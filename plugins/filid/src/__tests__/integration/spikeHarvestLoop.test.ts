import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getCacheDir } from '../../core/infra/cacheManager/cacheManager.js';

/**
 * End-to-end mechanical simulation of the spike-harvest loop against a REAL
 * git repository and the BUILT hook bundles. Covers the machine-enforced
 * half of issue #67: mode gate, per-prompt banner lifecycle (missing →
 * current → stale manifest), criteria ledger lint, and the mode audit
 * trail. The LLM-contract half (review claim verdicts, harvest interview)
 * is NOT covered here — its regression proxy is the calibration fixture
 * `skills/review/calibration/claim-change.md` (run-d), executed manually
 * per calibration.md.
 */

const here = fileURLToPath(import.meta.url);
const bridgeDir = resolve(here, '../../../..', 'bridge');
const preToolBundle = resolve(bridgeDir, 'pre-tool-use.mjs');
const promptBundle = resolve(bridgeDir, 'user-prompt-submit.mjs');
const bundlesExist = existsSync(preToolBundle) && existsSync(promptBundle);
const gitAvailable = spawnSync('git', ['--version']).status === 0;
const runnable = bundlesExist && gitAvailable;

let repo: string;

function git(...args: string[]): string {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

function runHook(
  bundle: string,
  input: Record<string, unknown>,
): { hookSpecificOutput?: Record<string, unknown> } {
  const result = spawnSync('node', [bundle], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 10_000,
    env: { ...process.env, CLAUDE_CONFIG_DIR: join(repo, 'claude-home') },
  });
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as {
    hookSpecificOutput?: Record<string, unknown>;
  };
}

function promptBanner(): string {
  const output = runHook(promptBundle, {
    cwd: repo,
    session_id: `sim-${Math.random().toString(36).slice(2)}`,
    prompt: 'next step',
    hook_event_name: 'UserPromptSubmit',
  });
  return (output.hookSpecificOutput?.additionalContext as string) ?? '';
}

function writeViaHook(filePath: string, content: string) {
  return runHook(preToolBundle, {
    cwd: repo,
    session_id: 'sim-write',
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
    hook_event_name: 'PreToolUse',
  });
}

const OVERSIZED_INTENT = Array.from(
  { length: 60 },
  (_, i) => `Line ${i + 1}`,
).join('\n');

const VALID_CLAIM = [
  '# Acceptance Criteria Ledger',
  '',
  '## CLM-001: spike gate exempts doc hygiene',
  '- status: active',
  '- scope: src/hooks/preToolUse',
  '- claim: spike branches bypass INTENT.md doc-hygiene denies',
  '- observable: bundle smoke test on a spike fixture repo',
  '- expected: oversized INTENT.md Write returns no deny decision',
  '- source: spike/poc harvest 2026-06-12 (D-01)',
].join('\n');

function writeManifest(headSha: string): void {
  const dir = join(repo, '.filid', 'harvest', 'spike--poc');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      base_sha: 'b'.repeat(40),
      head_sha: headSha,
      diff_hash: 'd'.repeat(64),
      criteria_delta_hash: 'c'.repeat(64),
      created_at: '2026-06-12T00:00:00Z',
    }),
  );
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'filid-spike-loop-'));
  // Same cache root as the spawned bundles, so getCacheDir() resolves the
  // audit file the hooks actually wrote.
  process.env.CLAUDE_CONFIG_DIR = join(repo, 'claude-home');
  if (!runnable) return;
  git('init', '-q', '-b', 'main', '.');
  git('config', 'user.email', 'sim@filid.test');
  git('config', 'user.name', 'Spike Sim');
  mkdirSync(join(repo, '.filid'));
  writeFileSync(join(repo, '.filid', 'config.json'), '{}');
  writeFileSync(join(repo, 'INTENT.md'), '# root\n');
  git('add', '-A');
  git('commit', '-qm', 'init');
  git('checkout', '-qb', 'spike/poc');
  writeFileSync(join(repo, 'probe.txt'), 'probe\n');
  git('add', 'probe.txt');
  git('commit', '-qm', 'probe: first exploration');
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(repo, { recursive: true, force: true });
});

describe.skipIf(!runnable)(
  'spike-harvest loop (real git + built bundles)',
  () => {
    it('banner: unharvested spike shows day, ref updates, and the harvest exit', () => {
      const banner = promptBanner();
      expect(banner).toContain('SPIKE MODE — branch spike/poc (day 1');
      expect(banner).toContain('Unharvested decisions (ref updates): 2');
      expect(banner).toContain('INSUFFICIENT-EVIDENCE (harvest-required)');
    });

    it('banner lifecycle: manifest current at HEAD, then auto-invalidated by the next commit', () => {
      writeManifest(git('rev-parse', 'HEAD'));
      expect(promptBanner()).toContain('Harvest manifest current');

      writeFileSync(join(repo, 'probe2.txt'), 'more\n');
      git('add', 'probe2.txt');
      git('commit', '-qm', 'probe: post-harvest commit');
      expect(promptBanner()).toContain('Harvest manifest STALE');
    });

    it('banner disappears when checkout leaves the spike namespace', () => {
      git('checkout', '-q', 'main');
      expect(promptBanner()).not.toContain('[filid:spike]');
    });

    it('mode gate: oversized INTENT.md Write is exempt on spike, denied on main, both audited', () => {
      const spikeResult = writeViaHook(
        join(repo, 'INTENT.md'),
        OVERSIZED_INTENT,
      );
      expect(
        spikeResult.hookSpecificOutput?.permissionDecision,
      ).toBeUndefined();

      git('checkout', '-q', 'main');
      const mainResult = writeViaHook(
        join(repo, 'INTENT.md'),
        OVERSIZED_INTENT,
      );
      expect(mainResult.hookSpecificOutput?.permissionDecision).toBe('deny');

      const audit = readFileSync(
        join(getCacheDir(repo), 'mode-audit.jsonl'),
        'utf-8',
      )
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      expect(audit.map((entry) => entry.decision)).toEqual(['exempt', 'deny']);
      expect(audit.map((entry) => entry.mode)).toEqual(['spike', 'normal']);
    });

    it('criteria lint holds in spike mode: valid append allowed, claim deletion denied', () => {
      const ledgerPath = join(repo, '.filid', 'criteria.md');
      const appendResult = writeViaHook(ledgerPath, VALID_CLAIM);
      expect(
        appendResult.hookSpecificOutput?.permissionDecision,
      ).toBeUndefined();

      writeFileSync(ledgerPath, VALID_CLAIM);
      const deleteResult = writeViaHook(
        ledgerPath,
        '# Acceptance Criteria Ledger\n',
      );
      expect(deleteResult.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(
        deleteResult.hookSpecificOutput?.permissionDecisionReason,
      ).toContain('CLM-001');
    });

    it('criteria lint simulates Edit with replace_all — claim removal via rename is denied', () => {
      const ledgerPath = join(repo, '.filid', 'criteria.md');
      // Cross-reference BEFORE the heading: a first-occurrence-only
      // projection would alter only the mention and falsely allow.
      writeFileSync(
        ledgerPath,
        `# Acceptance Criteria Ledger\n\nSee CLM-001 below.\n\n${VALID_CLAIM.split('\n').slice(2).join('\n')}\n`,
      );
      const result = runHook(preToolBundle, {
        cwd: repo,
        session_id: 'sim-edit',
        tool_name: 'Edit',
        tool_input: {
          file_path: ledgerPath,
          old_string: 'CLM-001',
          new_string: 'CLM-RENAMED',
          replace_all: true,
        },
        hook_event_name: 'PreToolUse',
      });
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'CLM-001',
      );
    });

    it('criteria lint rejects gamed claims (missing observable) even on the spike branch', () => {
      const gamed = VALID_CLAIM.split('\n')
        .filter((line) => !line.startsWith('- observable'))
        .join('\n');
      const result = writeViaHook(join(repo, '.filid', 'criteria.md'), gamed);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'observable',
      );
    });

    it('criteria lint denies the empty-content Write that would wipe the ledger', () => {
      const ledgerPath = join(repo, '.filid', 'criteria.md');
      writeFileSync(ledgerPath, VALID_CLAIM);
      const result = writeViaHook(ledgerPath, '');
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'CLM-001',
      );
    });
  },
);
