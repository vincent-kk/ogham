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

describe('a set whose notepad path is a directory', () => {
  beforeEach(() => mkdirSync(join(directory, 'notepad.jsonl')));

  it('reports status and bind without throwing', () => {
    expect(
      handleRuntime({ ...request, directives_op: 'status' }, now),
    ).toMatchObject({ status: 'ok', notepadLines: 0 });
    expect(
      handleRuntime({ ...request, directives_op: 'bind' }, now),
    ).toMatchObject({ status: 'accepted', notepadLines: 0 });
  });

  it('appends one history line without throwing', () => {
    expect(
      handleRuntime(
        { ...request, directives_op: 'append', log: 'history', text: 'h' },
        now,
      ),
    ).toMatchObject({ status: 'ok', op: 'append' });
    const lines = readFileSync(join(directory, 'history.jsonl'), 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '');
    expect(lines).toHaveLength(2);
  });
});

describe.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
  'an unreadable entry document over its byte limit',
  () => {
    it('reports both violations on bind and estimates the pointer mode', () => {
      writeFileSync(join(directory, 'index.md'), 'x'.repeat(4001));
      chmodSync(join(directory, 'index.md'), 0o000);
      expect(
        handleRuntime({ ...request, directives_op: 'bind' }, now),
      ).toMatchObject({
        estimatedMode: 'pointer',
        violations: [
          { file: 'index.md', problem: 'over_limit' },
          { file: 'index.md', problem: 'unreadable', detail: 'EACCES' },
        ],
      });
    });
  },
);
