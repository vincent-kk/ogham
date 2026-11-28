import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { writeLogLine } from '../writeLogLine.js';

/** Largest number of bytes one simulated write call accepts. */
const SHORT_WRITE_BYTES = 5;

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeSync: (descriptor: number, data: Uint8Array | string, offset = 0) => {
      const bytes = typeof data === 'string' ? Buffer.from(data) : data;
      const length = Math.min(bytes.byteLength - offset, SHORT_WRITE_BYTES);
      return actual.writeSync(descriptor, bytes, offset, length);
    },
  };
});

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(portableJoin(tmpdir(), 'seiri-write-log-line-'));
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

it('writes the whole line when each write call accepts only part of it', () => {
  const path = portableJoin(directory, 'notepad.jsonl');
  const line = `${JSON.stringify({ at: '2026-01-01T00:00:00.000Z', text: '한글 메모 and more' })}\n`;
  expect(writeLogLine(path, line)).toBe(true);
  expect(readFileSync(path, 'utf8')).toBe(line);
});
