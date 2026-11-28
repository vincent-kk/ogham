import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { writeConfig } from '../../../../core/infra/configLoader/loaders/writeConfig.js';
import type { RuntimeInput } from '../runtime.js';
import { handleRuntime } from '../runtime.js';

let root: string;
let directory: string;
let request: RuntimeInput;
const now = Date.UTC(2026, 0, 1);

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'seiri-runtime-inspect-')));
  mkdirSync(join(root, '.git'));
  writeConfig(root, 'project', { intervention: 'standard' });
  directory = join(root, '.seiri', 'directives', 'flow');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.md'), 'Entry names `principles.md`.');
  writeFileSync(join(directory, 'principles.md'), 'p');
  writeFileSync(
    join(directory, 'notepad.jsonl'),
    '{"at":"a","text":"b"}\nbad\n',
  );
  request = { action: 'directives', project_root: root, set: 'flow' };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const expected = {
  structured: true,
  notepadLines: 2,
  violations: [
    {
      file: 'notepad.jsonl',
      problem: 'unlisted',
      detail: 'not named in index.md',
    },
    { file: 'notepad.jsonl', problem: 'invalid_line', detail: 'line 2' },
  ],
};

it('carries the inspection on an accepted bind', () => {
  expect(
    handleRuntime({ ...request, directives_op: 'bind' }, now),
  ).toMatchObject({ status: 'accepted', ...expected });
});

it('carries the inspection on a bind refused by a low dial', () => {
  writeConfig(root, 'project', { intervention: 'off' });
  expect(
    handleRuntime({ ...request, directives_op: 'bind' }, now),
  ).toMatchObject({ status: 'dial_low', ...expected });
});

it('carries the inspection on status, with and without a low dial', () => {
  expect(
    handleRuntime({ ...request, directives_op: 'status' }, now),
  ).toMatchObject({ status: 'ok', ...expected });
  writeConfig(root, 'project', { intervention: 'advisory' });
  expect(
    handleRuntime({ ...request, directives_op: 'status' }, now),
  ).toMatchObject({ status: 'dial_low', ...expected });
});

it('reports an unstructured set as not structured with no violations', () => {
  rmSync(join(directory, 'index.md'));
  expect(
    handleRuntime({ ...request, directives_op: 'status' }, now),
  ).toMatchObject({ structured: false, violations: [], notepadLines: 2 });
});
