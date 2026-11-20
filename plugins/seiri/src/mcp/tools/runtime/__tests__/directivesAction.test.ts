import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { updateDirectiveBinding } from '../../../../core/directives/utils/updateDirectiveBinding.js';
import { writeConfig } from '../../../../core/infra/configLoader/loaders/writeConfig.js';
import type { RuntimeInput } from '../runtime.js';
import { handleRuntime } from '../runtime.js';

let root: string;
let directory: string;
let request: RuntimeInput;

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'seiri-runtime-directives-')));
  mkdirSync(join(root, '.git'));
  writeConfig(root, 'project', { intervention: 'standard' });
  directory = join(root, '.seiri', 'directives', 'focus');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'focus.md'), 'focus');
  request = { action: 'directives', project_root: root, set: 'focus' };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('validates bind and gives the default scope and estimate without committing', () => {
  expect(handleRuntime({ ...request, directives_op: 'bind' })).toEqual({
    status: 'accepted',
    op: 'bind',
    set: 'focus',
    scope: 'session',
    files: ['focus.md'],
    bytes: 5,
    estimatedMode: 'inline',
  });
  expect(existsSync(join(directory, 'binding.json'))).toBe(false);
});

it('warns on bind while preserving a user-owned ignore file', () => {
  const ignore = join(root, '.seiri', '.gitignore');
  writeFileSync(ignore, '# owned by project\n');
  writeFileSync(join(directory, 'focus.md'), 'x'.repeat(4001));
  expect(
    handleRuntime({ ...request, directives_op: 'bind', scope: 'all' }),
  ).toMatchObject({
    status: 'accepted',
    scope: 'all',
    estimatedMode: 'pointer',
    warning: expect.stringContaining('directives/'),
  });
  expect(readFileSync(ignore, 'utf8')).toBe('# owned by project\n');
});

it('reports the effective low dial for bind and status', () => {
  writeConfig(root, 'project', { intervention: 'off' });
  for (const op of ['bind', 'status'] as const)
    expect(handleRuntime({ ...request, directives_op: op })).toMatchObject({
      op,
      status: 'dial_low',
      dial: 'off',
    });
  expect(existsSync(join(directory, 'binding.json'))).toBe(false);
});

it('reports the stored binding, toggles its enabled flag and removes the set', () => {
  const binding = { scope: 'all', enabled: true, root, boundAt: 1 } as const;
  updateDirectiveBinding(root, 'focus', () => binding);

  expect(handleRuntime({ ...request, directives_op: 'off' })).toMatchObject({
    binding: { ...binding, enabled: false },
  });
  expect(handleRuntime({ ...request, directives_op: 'status' })).toMatchObject({
    binding: { ...binding, enabled: false },
  });
  expect(handleRuntime({ ...request, directives_op: 'on' })).toMatchObject({
    binding,
  });
  expect(handleRuntime({ ...request, directives_op: 'remove' })).toMatchObject({
    status: 'ok',
    op: 'remove',
  });
  expect(existsSync(directory)).toBe(false);
});

it('rejects bind when the set name is invalid, missing or empty', () => {
  for (const set of ['../focus', 'missing'])
    expect(() =>
      handleRuntime({ ...request, directives_op: 'bind', set }),
    ).toThrow();
  rmSync(join(directory, 'focus.md'));
  expect(() => handleRuntime({ ...request, directives_op: 'bind' })).toThrow(
    /empty/i,
  );
});
