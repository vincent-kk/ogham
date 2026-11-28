import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { inspectDirectiveSet } from '../utils/inspectDirectiveSet.js';

let directory: string;
let root: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-inspect-unreadable-'));
  directory = portableJoin(root, '.seiri', 'directives', 'flow');
  ensureDirectorySync(directory);
  writeFileAtomicallySync(
    portableJoin(directory, 'index.md'),
    '`notepad.jsonl` `history.jsonl`',
  );
  writeFileAtomicallySync(
    portableJoin(directory, 'notepad.jsonl'),
    '{"a":1}\n',
  );
  writeFileAtomicallySync(
    portableJoin(directory, 'history.jsonl'),
    '{"a":1}\n',
  );
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
  'a file that cannot be read',
  () => {
    it('is reported as unreadable with the error code while the rest is inspected', () => {
      chmodSync(portableJoin(directory, 'history.jsonl'), 0o000);
      expect(inspectDirectiveSet(root, 'flow')).toEqual({
        structured: true,
        violations: [
          { file: 'history.jsonl', problem: 'unreadable', detail: 'EACCES' },
        ],
        notepadLines: 1,
      });
    });

    it('leaves the notepad count at zero and reports the notepad as unreadable', () => {
      chmodSync(portableJoin(directory, 'notepad.jsonl'), 0o000);
      expect(inspectDirectiveSet(root, 'flow')).toEqual({
        structured: true,
        violations: [
          { file: 'notepad.jsonl', problem: 'unreadable', detail: 'EACCES' },
        ],
        notepadLines: 0,
      });
    });

    it('reports an unreadable entry document as the only violation of a structured set', () => {
      chmodSync(portableJoin(directory, 'index.md'), 0o000);
      chmodSync(portableJoin(directory, 'history.jsonl'), 0o000);
      expect(inspectDirectiveSet(root, 'flow')).toEqual({
        structured: true,
        violations: [
          { file: 'index.md', problem: 'unreadable', detail: 'EACCES' },
        ],
        notepadLines: 1,
      });
    });
  },
);
