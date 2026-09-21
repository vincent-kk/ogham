import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { collectHumanCalls } from './helpers/collectHumanCalls.js';

/** Plugin package root the collector scans. */
const PACKAGE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** One allowed human call; `class` and `note` record its triage (see the S6 inventory). */
interface AllowlistEntry {
  file: string;
  hash: string;
  kind: string;
  class: 'U' | 'M' | 'E' | 'S' | 'N';
  text: string;
  note: string;
}

const allowlist = JSON.parse(
  readFileSync(
    new URL('./fixtures/humanCallAllowlist.json', import.meta.url),
    'utf8',
  ),
) as { entries: AllowlistEntry[] };

/**
 * The key an allowlist entry and a collected call share.
 * @param entry File and normalized-sentence hash.
 * @returns `file#hash`.
 */
function keyOf({ file, hash }: { file: string; hash: string }): string {
  return `${file}#${hash}`;
}

describe('every sentence that hands the run to a person is on the allowlist', () => {
  const collected = collectHumanCalls(PACKAGE_ROOT);

  it('collects no sentence missing from the allowlist', () => {
    const allowed = new Set(allowlist.entries.map(keyOf));
    expect(
      collected
        .filter((call) => !allowed.has(keyOf(call)))
        .map(({ file, line, text }) => `${file}:${line} ${text}`),
    ).toEqual([]);
  });

  it('keeps no allowlist entry the code no longer contains', () => {
    const present = new Set(collected.map(keyOf));
    expect(
      allowlist.entries
        .filter((entry) => !present.has(keyOf(entry)))
        .map(({ file, text }) => `${file} ${text}`),
    ).toEqual([]);
  });
});
