import { lstatSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  ensureDirectorySync,
  portableJoin,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import * as filesystem from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { IDLE_STATE_TTL } from '../../../constants/retention.js';
import type { DirectiveBinding } from '../../../types/directives.js';
import { readDirectiveBindings } from '../utils/readDirectiveBindings.js';
import { sweepStaleDirectives } from '../utils/sweepStaleDirectives.js';
import { updateDirectiveBinding } from '../utils/updateDirectiveBinding.js';

let root: string;
let directory: string;
let binding: DirectiveBinding;
const now = Date.UTC(2026, 0, 30);

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmpdir(), 'seiri-directive-bindings-'));
  directory = portableJoin(root, '.seiri', 'directives', 'focus');
  ensureDirectorySync(directory);
  writeFileAtomicallySync(portableJoin(directory, 'focus.md'), 'body');
  binding = { scope: 'all', enabled: true, root, boundAt: now };
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

it('does not write when the binding is locked', () => {
  expect(updateDirectiveBinding(root, 'focus', () => binding)).toBe(true);
  ensureDirectorySync(portableJoin(directory, 'binding.lock'));
  const update = () => {
    throw new Error('A locked binding must not be read for update');
  };
  expect(updateDirectiveBinding(root, 'focus', update)).toBe(false);
  expect(readDirectiveBindings(root)).toEqual({ focus: binding });
});

it('rejects a binding if the set is removed before acquiring its lock', () => {
  const lock = filesystem.withFileLockSync;
  vi.spyOn(filesystem, 'withFileLockSync').mockImplementationOnce(
    (target, operation, options) => {
      rmSync(directory, { recursive: true });
      return lock(target, operation, options);
    },
  );

  const updated = updateDirectiveBinding(root, 'focus', () => binding);

  expect(
    lstatSync(portableJoin(directory, 'binding.json'), {
      throwIfNoEntry: false,
    }),
  ).toBeUndefined();
  expect(updated).toBe(false);
});

it('finishes a locked removal without recreating the set or leaving a lock', () => {
  expect(updateDirectiveBinding(root, 'focus', () => binding)).toBe(true);
  expect(
    updateDirectiveBinding(root, 'focus', (current) => {
      expect(current).toEqual(binding);
      expect(
        lstatSync(portableJoin(directory, 'binding.lock')).isDirectory(),
      ).toBe(true);
      rmSync(directory, { recursive: true });
      return undefined;
    }),
  ).toBe(true);

  expect(lstatSync(directory, { throwIfNoEntry: false })).toBeUndefined();
  expect(
    lstatSync(portableJoin(directory, 'binding.lock'), {
      throwIfNoEntry: false,
    }),
  ).toBeUndefined();
  expect(readDirectiveBindings(root)).toEqual({});
});

it('updates the injection time without resurrecting a disabled binding', () => {
  updateDirectiveBinding(root, 'focus', () => binding);
  updateDirectiveBinding(
    root,
    'focus',
    (current) => current && { ...current, enabled: false },
  );
  updateDirectiveBinding(root, 'focus', (current) =>
    current?.enabled ? { ...current, lastInjectedAt: now } : current,
  );
  expect(readDirectiveBindings(root)).toEqual({
    focus: { ...binding, enabled: false },
  });
});

it('skips corrupt or malformed binding records', () => {
  const file = portableJoin(directory, 'binding.json');
  writeFileAtomicallySync(file, '{');
  expect(readDirectiveBindings(root)).toEqual({});
  writeFileAtomicallySync(
    file,
    JSON.stringify({ ...binding, scope: 'session' }),
  );
  expect(readDirectiveBindings(root)).toEqual({});
});

it.each([
  ['old', IDLE_STATE_TTL + 1000, undefined, false],
  ['boundary', IDLE_STATE_TTL, undefined, true],
  ['injected recently', IDLE_STATE_TTL + 1000, now, true],
  ['saved recently', 1000, undefined, true],
] as const)(
  'sweeps a set based on its newest activity (%s)',
  (_, age, injected, kept) => {
    const body = portableJoin(directory, 'focus.md');
    writeFileAtomicallySync(body, 'body');
    const modified = new Date(now - age);
    utimesSync(body, modified, modified);
    updateDirectiveBinding(root, 'focus', () => ({
      ...binding,
      boundAt: now - IDLE_STATE_TTL - 1000,
      lastInjectedAt: injected,
    }));
    sweepStaleDirectives(root, now);
    expect(
      lstatSync(directory, { throwIfNoEntry: false })?.isDirectory() ?? false,
    ).toBe(kept);
  },
);
