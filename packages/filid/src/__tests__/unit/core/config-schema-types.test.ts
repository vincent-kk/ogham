/**
 * @file config-schema-types.test.ts
 * @description Type-level contract tests for Commit A (v0.4.0 Schema Validation).
 *
 * Verifies:
 *  - FilidConfig retains its original top-level shape after becoming a zod
 *    `z.infer` alias (structural equivalence to the prior interface).
 *  - RuleOverride gains the optional `exempt?: string[]` field.
 *  - The public facade re-exports FilidConfigSchema / RuleOverrideSchema /
 *    AllowedEntrySchema so Commits B/D can consume them without duplication.
 *
 * SSoT anchor for AC12 and plan §3 row A.
 */
import { describe, expectTypeOf, it } from 'vitest';

import {
  AllowedEntrySchema,
  FilidConfigSchema,
  RuleOverrideSchema,
  type FilidConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import type { RuleOverride, RuleSeverity } from '../../../types/rules.js';

describe('config-schema-types (Commit A)', () => {
  it('FilidConfig retains the original top-level shape', () => {
    expectTypeOf<FilidConfig['version']>().toEqualTypeOf<string>();
    expectTypeOf<FilidConfig['language']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<FilidConfig['additional-allowed']>().toEqualTypeOf<
      string[] | undefined
    >();
    expectTypeOf<FilidConfig>().toMatchTypeOf<{
      version: string;
      rules: Record<string, RuleOverride>;
      language?: string;
      'additional-allowed'?: string[];
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

  it('schemas are exported from the public loader facade', () => {
    expectTypeOf(FilidConfigSchema.parse).toBeFunction();
    expectTypeOf(RuleOverrideSchema.parse).toBeFunction();
    expectTypeOf(AllowedEntrySchema.parse).toBeFunction();
    const sample = FilidConfigSchema.parse({ version: '1.0', rules: {} });
    expectTypeOf(sample).toMatchTypeOf<FilidConfig>();
  });
});
