import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { VERSION } from '../../../../../version.js';
import { runSessionStart } from '../index.js';
import body from '../metaSkillBody.md';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'document-policies-'));
  vi.stubEnv('OGHAM_HOST', 'claude');
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

it('injects source locations only in active maencof sessions within budget', () => {
  expect(
    runSessionStart({ cwd: root }).hookSpecificOutput?.additionalContext,
  ).not.toContain('original source');
  mkdirSync(join(root, '.maencof'));
  mkdirSync(join(root, '.maencof-meta'));
  expect(
    runSessionStart({ cwd: root }).hookSpecificOutput?.additionalContext,
  ).toContain('original source');
  expect(Array.from(body).length).toBeLessThanOrEqual(4096);
});
it('respects the dialogue off-switch', () => {
  mkdirSync(join(root, '.maencof'));
  mkdirSync(join(root, '.maencof-meta'));
  vi.stubEnv('MAENCOF_DISABLE_DIALOGUE', '1');
  expect(
    runSessionStart({ cwd: root }).hookSpecificOutput?.additionalContext,
  ).not.toContain('original source');
});
it('updates owned directives and preserves surrounding instructions', () => {
  mkdirSync(join(root, '.maencof'));
  mkdirSync(join(root, '.maencof-meta'));
  writeFileSync(
    join(root, 'CLAUDE.md'),
    'User prefix\n<!-- MAENCOF:START -->\nOld\n<!-- MAENCOF:END -->\nUser suffix\n',
  );
  writeFileSync(
    join(root, '.maencof-meta/version.json'),
    JSON.stringify({ version: '0.0.0' }),
  );
  runSessionStart({ cwd: root });
  const text = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
  expect(text).toContain('Read the whole existing document');
  expect(text).toContain('User prefix\n');
  expect(text).toContain('\nUser suffix\n');
});

it('delivers insight routing from the previous release and preserves same-version edits', () => {
  mkdirSync(join(root, '.maencof'));
  mkdirSync(join(root, '.maencof-meta'));
  const instructions = join(root, 'CLAUDE.md');
  writeFileSync(
    instructions,
    'Prefix\n<!-- MAENCOF:START -->\nLegacy capture\n<!-- MAENCOF:END -->\nSuffix\n',
  );
  writeFileSync(
    join(root, '.maencof-meta/version.json'),
    JSON.stringify({
      version: '0.16.1',
      installedAt: '2026-09-01T00:00:00.000Z',
      migrationHistory: [],
    }),
  );
  const output = runSessionStart({ cwd: root }).hookSpecificOutput
    ?.additionalContext;
  expect(output).toContain('organize --insights');
  const updated = readFileSync(instructions, 'utf8');
  expect(updated).toContain('organize --insights');
  expect(updated).not.toContain('Legacy capture');
  expect(updated).toContain('Prefix\n');
  expect(updated).toContain('\nSuffix\n');
  expect(
    JSON.parse(readFileSync(join(root, '.maencof-meta/version.json'), 'utf8'))
      .version,
  ).toBe(VERSION);
  const customized = updated.replace(
    '## Auto-Insight Capture',
    '## Auto-Insight Capture\nOwned customization',
  );
  writeFileSync(instructions, customized);
  runSessionStart({ cwd: root });
  expect(readFileSync(instructions, 'utf8')).toBe(customized);
});

it('omits capture policy when disabled without disabling knowledge recall routing', () => {
  mkdirSync(join(root, '.maencof'));
  mkdirSync(join(root, '.maencof-meta'));
  writeFileSync(
    join(root, '.maencof-meta/insight-config.json'),
    JSON.stringify({
      enabled: false,
      sensitivity: 'medium',
      max_captures_per_session: 10,
      notify: true,
    }),
  );
  const output = runSessionStart({ cwd: root }).hookSpecificOutput
    ?.additionalContext;
  expect(output).not.toContain('<auto-insight enabled=');
  expect(output).toContain('insight-synthesis');
});
