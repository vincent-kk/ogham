import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FileFactsSchema } from '../../core/facts/index.js';
import { extractFileFacts } from '../../factsExtractor/index.js';
import type {
  ExportedName,
  FileFacts,
  Reference,
} from '../../factsExtractor/index.js';

/** Project the extractor runs over; every optional axis of a record appears in it. */
let root: string;
/** Records the extractor produced for that project. */
let records: unknown[];

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-shape-'));
  writeFileSync(
    join(root, 'index.ts'),
    "export { thing } from './thing.js';\nexport const local = 1;\n",
  );
  writeFileSync(join(root, 'thing.ts'), 'export const thing = 1;\n');
  writeFileSync(
    join(root, 'thing.test.ts'),
    "import { describe, it } from 'vitest';\n\ndescribe('thing', () => {\n  it('holds', () => undefined);\n});\n",
  );
  writeFileSync(join(root, 'broken.ts'), 'const a = `unterminated\n');
  records = (
    await extractFileFacts(
      root,
      ['index.ts', 'thing.ts', 'thing.test.ts', 'broken.ts'],
      'filid-facts --root .',
    )
  ).records;
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

/**
 * Every key the records use, as dotted paths through objects and arrays.
 * @param value One record or part of one.
 * @param prefix Dotted path of `value` itself.
 * @returns Dotted key paths below `value`.
 */
function keysOf(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value))
    return value.flatMap((entry) => keysOf(entry, prefix));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...keysOf(child, path)];
  });
}

/**
 * Every key the schema accepts, as dotted paths, unions and optionals unwrapped.
 * @param schema One zod schema node.
 * @param prefix Dotted path of the node itself.
 * @returns Dotted key paths the schema defines below it.
 */
function schemaKeys(schema: z.ZodTypeAny, prefix = ''): string[] {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return schemaKeys(schema.unwrap() as z.ZodTypeAny, prefix);
  if (schema instanceof z.ZodEffects)
    return schemaKeys(schema.innerType() as z.ZodTypeAny, prefix);
  if (schema instanceof z.ZodArray)
    return schemaKeys(schema.element as z.ZodTypeAny, prefix);
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion)
    return (schema.options as z.ZodTypeAny[]).flatMap((option) =>
      schemaKeys(option, prefix),
    );
  if (schema instanceof z.ZodObject)
    return Object.entries(schema.shape as Record<string, z.ZodTypeAny>).flatMap(
      ([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return [path, ...schemaKeys(child, path)];
      },
    );
  return [];
}

/**
 * The keys one level of a type declares, present or optional.
 *
 * Written out rather than derived, so a field added to the extractor's type
 * stops compiling here until it is named — the schema comparison below then
 * says whether the server knows it.
 */
type KeysOf<T> = Record<keyof T, true>;

const RECORD_KEYS: KeysOf<FileFacts> = {
  schemaVersion: true,
  path: true,
  contentHash: true,
  references: true,
  entrySurface: true,
  verification: true,
  nonReferences: true,
  toolError: true,
  provenance: true,
};
const REFERENCE_KEYS: KeysOf<Reference> = {
  specifier: true,
  sourceText: true,
  line: true,
  kind: true,
  certainty: true,
  resolved: true,
};
const EXPORTED_NAME_KEYS: KeysOf<ExportedName> = { name: true, line: true };
const PROVENANCE_KEYS: KeysOf<FileFacts['provenance']> = {
  tool: true,
  version: true,
  command: true,
  tier: true,
  resolutionInputs: true,
};
const ENTRY_SURFACE_KEYS: KeysOf<NonNullable<FileFacts['entrySurface']>> = {
  exportedNames: true,
  hasDirectDeclarations: true,
  certainty: true,
};
const VERIFICATION_KEYS: KeysOf<NonNullable<FileFacts['verification']>> = {
  role: true,
  cases: true,
  contractGroupIds: true,
};
const CASE_KEYS: KeysOf<NonNullable<FileFacts['verification']>['cases']> = {
  certainty: true,
  exactCount: true,
  knownLowerBound: true,
  reasons: true,
};

/**
 * Keys the server defines and the extractor's type deliberately never carries.
 *
 * `candidateLines` is the server's own answer: when a reported line does not
 * hold the text, validation keeps the name and trades the line for the lines
 * it is on (spec §4.2). No provider submits it.
 */
const SERVER_ONLY = [
  'references.candidateLines',
  'entrySurface.exportedNames.candidateLines',
];

/**
 * Dotted paths for one level's keys.
 * @param prefix Dotted path of the level itself, or '' for the record.
 * @param keys The level's key map.
 * @returns One dotted path per key.
 */
function under(prefix: string, keys: Record<string, true>): string[] {
  return Object.keys(keys).map((key) => (prefix ? `${prefix}.${key}` : key));
}

/** Every dotted path the extractor's own type can produce. */
const EXTRACTOR_TYPE_KEYS = [
  ...under('', RECORD_KEYS),
  ...under('references', REFERENCE_KEYS),
  'references.resolved.path',
  'references.resolved.external',
  'references.resolved.unresolved',
  'references.resolved.nonLiteral',
  ...under('entrySurface', ENTRY_SURFACE_KEYS),
  ...under('entrySurface.exportedNames', EXPORTED_NAME_KEYS),
  ...under('verification', VERIFICATION_KEYS),
  ...under('verification.cases', CASE_KEYS),
  'nonReferences.line',
  'nonReferences.reason',
  'toolError.message',
  'toolError.line',
  ...under('provenance', PROVENANCE_KEYS),
  'provenance.resolutionInputs.path',
  'provenance.resolutionInputs.contentHash',
];

describe('the extractor writes records in the shape the server accepts', () => {
  it('declares every field the server schema does, and no other', () => {
    // The sample records below cannot show this: a field absent from them is
    // indistinguishable from one the extractor's type does not have, so a
    // server-only optional field would be silently unreachable.
    const schema = new Set(schemaKeys(FileFactsSchema));
    const declared = new Set(EXTRACTOR_TYPE_KEYS);

    expect([...schema].filter((key) => !declared.has(key))).toEqual(
      SERVER_ONLY,
    );
    expect([...declared].filter((key) => !schema.has(key))).toEqual([]);
  });

  it('uses no key the server schema does not define', () => {
    const accepted = new Set(schemaKeys(FileFactsSchema));
    expect(records.length).toBeGreaterThan(3);
    expect(
      [...new Set(records.flatMap((record) => keysOf(record)))]
        .filter((key) => !/\.\d+(\.|$)/.test(key))
        .filter((key) => !accepted.has(key)),
    ).toEqual([]);
  });

  it('carries every key the server requires, on every record it produced', () => {
    const required = Object.entries(
      FileFactsSchema.shape as Record<string, z.ZodTypeAny>,
    )
      .filter(([, child]) => !child.isOptional())
      .map(([key]) => key);
    expect(required).toContain('references');
    for (const record of records)
      expect(Object.keys(record as object)).toEqual(
        expect.arrayContaining(required),
      );
  });

  it('is accepted by the server schema, record for record', () => {
    for (const record of records)
      expect(FileFactsSchema.safeParse(record).success).toBe(true);
  });
});
