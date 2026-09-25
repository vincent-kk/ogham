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
