import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_REJECTION_CODES } from '../../../constants/facts.js';
import { validateFactsRecord } from '../../../core/facts/index.js';
import type {
  FactsValidationContext,
  FileFacts,
} from '../../../core/facts/index.js';

/** A specifier that crosses a line continuation, after an unrelated first line. */
const SOURCE = "export const a = 1;\nimport { b } from './b\\\n.js';\n";

/** Temporary project holding `a.ts`. */
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-multiline-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/**
 * Validate one record of `a.ts` holding a single reference.
 * @param contents Bytes of `a.ts` on disk.
 * @param sourceText The literal the provider claims the file holds.
 * @returns The validation result of the record.
 */
function validate(contents: string, sourceText: string) {
  writeFileSync(join(root, 'a.ts'), contents);
  const context: FactsValidationContext = {
    projectRoot: root,
    scannedPaths: new Set(['a.ts']),
    inScope: () => true,
    hashDeclaredInput: () => null,
  };
  const facts: FileFacts = {
    schemaVersion: 1,
    path: 'a.ts',
    contentHash: `sha256:${createHash('sha256').update(contents).digest('hex')}`,
    references: [
      {
        specifier: './b\n.js',
        sourceText,
        kind: 'static',
        resolved: { unresolved: true },
      },
    ],
    provenance: {
      tool: 'test',
      version: '1',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  };
  return validateFactsRecord(context, facts, '/0');
}

describe('a source text that spans a line break is located across lines', () => {
  it.each([
    ['LF', SOURCE],
    ['CRLF', SOURCE.replaceAll('\n', '\r\n')],
  ])(
    'accepts the reference and reports its first line in a %s file',
    (_label, contents) => {
      const result = validate(contents, "'./b\\\n.js'");
      expect(result.rejections).toEqual([]);
      expect(result.accepted?.references).toEqual([
        expect.objectContaining({ specifier: './b\n.js', candidateLines: [2] }),
      ]);
    },
  );

  it.each([
    ['its last part is not at the start of the next line', "'./b\\\n.jsx'"],
    ['its first part does not end the line', "'./b\n.js'"],
    ['a middle line differs', "'./b\\\n\n.js'"],
  ])('still rejects a multi-line text when %s', (_label, sourceText) => {
    const result = validate(SOURCE, sourceText);
    expect(result.accepted?.references).toEqual([]);
    expect(result.rejections).toEqual([
      expect.objectContaining({
        code: FACTS_REJECTION_CODES.REFERENCE_ABSENT,
        pointer: '/0/references/0',
      }),
    ]);
  });
});
