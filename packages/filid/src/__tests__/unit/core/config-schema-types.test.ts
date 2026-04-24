/**
 * @file config-schema-types.test.ts
 * @description Type-level contract tests for Commits A + B (v0.4.0 Schema Validation).
 *
 * Verifies:
 *  - FilidConfig retains its original top-level shape after becoming a zod
 *    `z.infer` alias (structural equivalence to the prior interface).
 *  - RuleOverride gains the optional `exempt?: string[]` field.
 *  - `additional-allowed` entries are now the `AllowedEntry` union
 *    (string or `{basename, paths?}` object) — strings remain backward-compatible.
 *  - The public facade re-exports FilidConfigSchema / RuleOverrideSchema /
 *    AllowedEntrySchema so Commits B/D can consume them without duplication.
 *
 * SSoT anchor for AC12, AC3, and plan §3 rows A/B.
 */
import { describe, expectTypeOf, it } from 'vitest';

import {
  AllowedEntrySchema,
  FilidConfigSchema,
  RuleOverrideSchema,
  type AllowedEntry,
  type FilidConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import type { RuleOverride, RuleSeverity } from '../../../types/rules.js';

describe('config-schema-types (Commits A + B)', () => {
  it('FilidConfig retains the original top-level shape', () => {
    expectTypeOf<FilidConfig['version']>().toEqualTypeOf<string>();
    expectTypeOf<FilidConfig['language']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<FilidConfig['additional-allowed']>().toEqualTypeOf<
      AllowedEntry[] | undefined
    >();
    expectTypeOf<FilidConfig>().toMatchTypeOf<{
      version: string;
      rules: Record<string, RuleOverride>;
      language?: string;
      'additional-allowed'?: AllowedEntry[];
      scan?: { maxDepth?: number };
    }>();
  });

  it('RuleOverride gains optional exempt field', () => {
    expectTypeOf<RuleOverride['enabled']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<RuleOverride['severity']>().toEqualTypeOf<
      RuleSeverity | undefined
    >();
    expectTypeOf<RuleOverride['exempt']>().toEqualTypeOf<
      string[] | undefined
    >();
  });

  it('AllowedEntry is a union of string and {basename, paths?}', () => {
    const s: AllowedEntry = 'type.ts';
    const o: AllowedEntry = { basename: 'CLAUDE.md', paths: ['packages/**'] };
    const o2: AllowedEntry = { basename: 'LICENSE' };
    expectTypeOf(s).toMatchTypeOf<AllowedEntry>();
    expectTypeOf(o).toMatchTypeOf<AllowedEntry>();
    expectTypeOf(o2).toMatchTypeOf<AllowedEntry>();
  });

  it('schemas are exported from the public loader facade', () => {
    expectTypeOf(FilidConfigSchema.parse).toBeFunction();
    expectTypeOf(RuleOverrideSchema.parse).toBeFunction();
    expectTypeOf(AllowedEntrySchema.parse).toBeFunction();
    const sample = FilidConfigSchema.parse({ version: '1.0', rules: {} });
    expectTypeOf(sample).toMatchTypeOf<FilidConfig>();
  });
});
