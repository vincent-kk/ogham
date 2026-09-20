import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractFileFacts } from '../../../factsExtractor/index.js';

/** Temporary project each case extracts from. */
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-contract-groups-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

/**
 * Extract one written file and return its verification section.
 * @param source Contents of the spec file to extract.
 * @returns The record's verification section.
 */
async function verificationOf(source: string): Promise<{
  contractGroupIds?: string[];
}> {
  writeFileSync(join(root, 'feature.spec.ts'), source);
  const [record] = (
    await extractFileFacts(root, ['feature.spec.ts'], 'cmd')
  ).records;
  return record.verification!;
}

describe('the record carries the contract groups a spec declares', () => {
  it('reports each marked group once, in marker order', async () => {
    const verification = await verificationOf(
      [
        '// filid:contract AC-create',
        '/* filid:contract AC-delete */',
        '// filid:contract AC-create',
        "import { it } from 'vitest';",
        "it('works', () => {});",
        '',
      ].join('\n'),
    );

    expect(verification.contractGroupIds).toEqual(['AC-create', 'AC-delete']);
  });

  it('reports an empty list for a file that marks none', async () => {
    const verification = await verificationOf(
      ["import { it } from 'vitest';", "it('works', () => {});", ''].join('\n'),
    );

    // Empty is a claim — "this file declares no group" — and the absence of the
    // field is not. Only a record that reports the list lets the spec-link rule
    // decide anything.
    expect(verification.contractGroupIds).toEqual([]);
  });

  it('leaves a marker inside a string literal out', async () => {
    const verification = await verificationOf(
      [
        "const sample = 'filid:contract AC-quoted';",
        "import { it } from 'vitest';",
        "it('works', () => {});",
        '',
      ].join('\n'),
    );

    expect(verification.contractGroupIds).toEqual([]);
  });
});
