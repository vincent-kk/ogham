import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  type AllowedPeerOverride,
  AllowedPeerOverrideSchema,
  type FilidConfig,
  FilidConfigSchema,
  RuleOverrideSchema,
} from '../../../core/infra/configLoader/index.js';
import type { RuleOverride, RuleSeverity } from '../../../types/rules.js';

describe('config-schema-types v2', () => {
  it('exposes the v2 adapter and structure contract', () => {
    expectTypeOf<FilidConfig['version']>().toEqualTypeOf<'2.0'>();
    expectTypeOf<FilidConfig['language']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<FilidConfig['adapters']>().toEqualTypeOf<{
      mode: 'auto' | 'explicit';
      enabled: string[];
    }>();
    expectTypeOf<FilidConfig['structure']>().toEqualTypeOf<
      | {
          maxDepth?: number;
          additionalOrganNames?: string[];
          additionalAllowedPeers?: AllowedPeerOverride[];
          entryPointOverrides?: Record<string, string[]>;
          generatedPaths?: string[];
        }
      | undefined
    >();
    expectTypeOf<FilidConfig>().toMatchTypeOf<{
      version: '2.0';
      adapters: { mode: 'auto' | 'explicit'; enabled: string[] };
      rules: Record<string, RuleOverride>;
      language?: string;
      structure?: {
        maxDepth?: number;
        additionalOrganNames?: string[];
        additionalAllowedPeers?: AllowedPeerOverride[];
        entryPointOverrides?: Record<string, string[]>;
        generatedPaths?: string[];
      };
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

  it('AllowedPeerOverride names a peer and optional scope and adapter', () => {
    const override: AllowedPeerOverride = {
      basename: 'manifest.file',
      paths: ['packages/**'],
      adapterId: 'custom',
    };
    expectTypeOf(override).toMatchTypeOf<AllowedPeerOverride>();
    expect(AllowedPeerOverrideSchema.parse(override)).toEqual(override);
  });

  it('parses structure customizations only under structure', () => {
    const parsed = FilidConfigSchema.parse({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      structure: {
        additionalOrganNames: ['docs', 'plans'],
        entryPointOverrides: { custom: ['module.entry'] },
      },
    });
    expect(parsed.structure?.additionalOrganNames).toEqual(['docs', 'plans']);
    expect(parsed.structure?.entryPointOverrides).toEqual({
      custom: ['module.entry'],
    });
    expect(() => FilidConfigSchema.parse({ ...parsed, extra: true })).toThrow();
  });

  it('schemas are exported from the public loader facade', () => {
    expectTypeOf(FilidConfigSchema.parse).toBeFunction();
    expectTypeOf(RuleOverrideSchema.parse).toBeFunction();
    expectTypeOf(AllowedPeerOverrideSchema.parse).toBeFunction();
    const sample = FilidConfigSchema.parse({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
    });
    expectTypeOf(sample).toMatchTypeOf<FilidConfig>();
  });
});
