import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FileFactsSchema } from '../../core/facts/index.js';
import { extractFileFacts } from '../../factsExtractor/index.js';

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

describe('the extractor writes records in the shape the server accepts', () => {
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
