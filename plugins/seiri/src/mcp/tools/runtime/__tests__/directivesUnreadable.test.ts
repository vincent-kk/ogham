import {
  chmodSync,
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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { updateDirectiveBinding } from '../../../../core/directives/utils/updateDirectiveBinding.js';
import { writeConfig } from '../../../../core/infra/configLoader/loaders/writeConfig.js';
import type { RuntimeInput } from '../runtime.js';
import { handleRuntime } from '../runtime.js';

let root: string;
let directory: string;
let request: RuntimeInput;
const now = Date.UTC(2026, 0, 1);

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'seiri-runtime-unreadable-')));
  mkdirSync(join(root, '.git'));
  writeConfig(root, 'project', { intervention: 'standard' });
  directory = join(root, '.seiri', 'directives', 'flow');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.md'), '`history.jsonl` `notepad.jsonl`');
  writeFileSync(join(directory, 'history.jsonl'), '{"a":1}\n');
  request = { action: 'directives', project_root: root, set: 'flow' };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
  'a set whose history cannot be read',
  () => {
    beforeEach(() => {
      updateDirectiveBinding(root, 'flow', () => ({
        scope: 'all',
        enabled: true,
        root,
        boundAt: 1,
      }));
      chmodSync(join(directory, 'history.jsonl'), 0o000);
    });

    it('still turns the binding off and on', () => {
      expect(
        handleRuntime({ ...request, directives_op: 'off' }, now),
      ).toMatchObject({ status: 'ok', op: 'off' });
      expect(
        handleRuntime({ ...request, directives_op: 'on' }, now),
      ).toMatchObject({ status: 'ok', op: 'on' });
    });

    it('still removes the set', () => {
      expect(
        handleRuntime({ ...request, directives_op: 'remove' }, now),
      ).toMatchObject({ status: 'ok', op: 'remove' });
      expect(existsSync(directory)).toBe(false);
    });

    it('still appends to the notepad and reports its line count', () => {
      expect(
        handleRuntime(
          { ...request, directives_op: 'append', log: 'notepad', text: 'n' },
          now,
        ),
      ).toMatchObject({ status: 'ok', op: 'append', notepadLines: 1 });
      expect(readFileSync(join(directory, 'notepad.jsonl'), 'utf8')).toContain(
        '"text":"n"',
      );
    });

    it('reports the unreadable file on status and bind instead of throwing', () => {
      const violation = {
        file: 'history.jsonl',
        problem: 'unreadable',
        detail: 'EACCES',
      };
      expect(
        handleRuntime({ ...request, directives_op: 'status' }, now),
      ).toMatchObject({ status: 'ok', violations: [violation] });
      expect(
        handleRuntime({ ...request, directives_op: 'bind' }, now),
      ).toMatchObject({ status: 'accepted', violations: [violation] });
    });
  },
);
