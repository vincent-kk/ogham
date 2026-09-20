import { describe, expect, it } from 'vitest';

import { collectDependencyReferences } from '../../../core/projectSnapshot/evidence/collectDependencyReferences.js';
import {
  resolveFactsScope,
  resolveFactsStorePaths,
} from '../../../core/facts/index.js';
import type {
  FactsFileState,
  FactsReference,
  ProjectFacts,
} from '../../../core/facts/index.js';
import { createDefaultConfig } from '../../../core/infra/configLoader/index.js';
import type {
  AdapterClaim,
  AdapterResolution,
  StructureAdapter,
} from '../../../types/adapters.js';

/** One ecmascript source file, the only one the fixtures scan. */
const FILE = 'src/a.ts';

/** The claim both `detect` and the ownership entry carry. */
const CLAIM: AdapterClaim = { confidence: 1, evidence: ['test fixture'] };

/** One adapter that owns `FILE` and is never asked to read anything. */
const FIXTURE_ADAPTER: StructureAdapter = {
  id: 'fixture',
  detect: async () => CLAIM,
  discoverSourceFiles: async () => [],
  findEntryPoints: async () => [],
  inspectEntryPoint: async (entryPointPath) => ({
    entryPoint: {
      path: entryPointPath,
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    },
    exportedNames: [],
    hasDirectDeclarations: false,
    certainty: 'exact',
  }),
  isFrameworkOwnedPeer: async () => false,
  suggestEntryPointPath: async (directoryPath) => `${directoryPath}/index.ts`,
};

/**
 * Adapter ownership without any adapter reading a file.
 *
 * Ownership survives the transition because it is what the snapshot hash
 * enumerates; no fixture here asks an adapter for references.
 * @param root Absolute project root.
 * @returns A resolution owning one file.
 */
function ownership(root: string): AdapterResolution {
  return {
    adapters: [FIXTURE_ADAPTER],
    ownership: new Map([
      [`${root}/${FILE}`, { adapter: FIXTURE_ADAPTER, claim: CLAIM }],
    ]),
    diagnostics: [],
    claims: new Map(),
    unsupportedPaths: [],
    unfollowedLinks: [],
  };
}

/**
 * One stored record of `FILE` holding the given references.
 * @param references References as a provider submitted them.
 * @param scope Declared facts scope; omitted means the default, which covers
 * `FILE` because it is a source file.
 * @returns The store contents one collector call reads.
 */
function facts(
  references: FactsReference[],
  scope?: { covers?: string[]; excludes?: string[] },
): ProjectFacts {
  const config =
    scope === undefined
      ? createDefaultConfig()
      : { ...createDefaultConfig(), facts: scope };
  return {
    scope: resolveFactsScope(config),
    scannedPaths: [FILE],
    scannedSet: new Set([FILE]),
    storePaths: resolveFactsStorePaths('/one'),
    records: new Map([
      [
        FILE,
        {
          pathDigest: 'digest',
          record: {
            schemaVersion: 1 as const,
            resolutionEpoch: 'sha256:epoch',
            rejectedClaims: [],
            facts: {
              schemaVersion: 1 as const,
              path: FILE,
              contentHash: `sha256:${'0'.repeat(64)}`,
              references,
              provenance: {
                tool: 'fixture',
                version: '1',
                command: '',
                tier: 'tool' as const,
                resolutionInputs: [],
              },
            },
          },
        },
      ],
    ]),
    shards: new Map(),
    epoch: {
      resolutionEpoch: 'sha256:epoch',
      scannedPaths: [FILE],
      resolutionInputs: [],
    },
    adjudications: new Map(),
    damagedJudgementShards: new Map(),
    judgementsDirectoryUnreadable: false,
    pending: new Map(),
  };
}

/** `FILE` in one state, as the collector receives the classification. */
function states(state: FactsFileState): Map<string, FactsFileState> {
  return new Map([[FILE, state]]);
}

/** Two unresolved references to one target and one to another. */
const UNRESOLVED: FactsReference[] = [
  { specifier: './moved.js', kind: 'static', resolved: { unresolved: true } },
  { specifier: './moved.js', kind: 'static', resolved: { unresolved: true } },
  { specifier: './other.js', kind: 'static', resolved: { unresolved: true } },
];

describe('dependency evidence read from the facts store', () => {
  it('reports an unresolved reference with a nextAction naming what to fix', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts(UNRESOLVED),
      states('exact'),
    );

    expect(result.diagnostics[0]?.code).toBe('unresolved-local-dependency');
    expect(result.diagnostics[0]?.nextAction).toContain('specifier');
    expect(result.references).toEqual([
      expect.objectContaining({ rawSpecifier: './moved.js', resolvedPath: null }),
      expect.objectContaining({ rawSpecifier: './moved.js', resolvedPath: null }),
      expect.objectContaining({ rawSpecifier: './other.js', resolvedPath: null }),
    ]);
    expect(result.certainty).toBe('exact');
  });

  it('shares a root-independent identity only for the same consumer and target', async () => {
    const first = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts(UNRESOLVED),
      states('exact'),
    );
    const second = await collectDependencyReferences(
      ownership('/two'),
      '/two',
      facts(UNRESOLVED),
      states('exact'),
    );

    expect(first.diagnostics[0]).toMatchObject({
      path: '/one/src/a.ts',
      specifier: './moved.js',
      affects: ['dependencies', 'boundaries'],
    });
    expect(first.diagnostics[0]?.causeId).toMatch(/^[a-f0-9]{64}$/);
    expect(first.diagnostics[0]?.causeId).toBe(first.diagnostics[1]?.causeId);
    expect(first.diagnostics[0]?.causeId).not.toBe(
      first.diagnostics[2]?.causeId,
    );
    expect(first.diagnostics.map(({ causeId }) => causeId)).toEqual(
      second.diagnostics.map(({ causeId }) => causeId),
    );
  });

  it.each([
    ['missing', 'facts-missing'],
    ['needs-resolution', 'facts-needs-resolution'],
    ['uncertain', 'facts-uncertain'],
    ['tool-error', 'facts-tool-error'],
  ])('attributes a %s file to itself and draws no edge from it', async (
    state,
    cause,
  ) => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([
        {
          specifier: './b.js',
          kind: 'static',
          resolved: { path: 'src/b.ts' },
        },
      ]),
      states(state as FactsFileState),
    );

    expect(result.unknownFiles).toEqual([{ path: FILE, causes: [cause] }]);
    expect(result.references).toEqual([]);
  });

  it('counts the source files the declared scope excludes without listing them as unknown', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([], { covers: ['nothing/**'] }),
      states('unsupported'),
    );

    expect(result.unknownFiles).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.filesOutsideFactsScope).toBe(1);
  });

  it('counts exactly the one source file an exclusion drops', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([], { excludes: [FILE] }),
      // `docs/guide.md` is outside the scope too, but no reference-based rule
      // was ever going to read it, so only the excluded source file counts.
      new Map<string, FactsFileState>([
        [FILE, 'unsupported'],
        ['docs/guide.md', 'unsupported'],
        ['src/b.ts', 'exact'],
      ]),
    );

    expect(result.filesOutsideFactsScope).toBe(1);
  });

  it('counts no document the default scope never covered', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([]),
      // No config at all: whatever the default scope leaves out is a file no
      // reference-based rule was ever going to read.
      new Map<string, FactsFileState>([
        [FILE, 'exact'],
        ['README.md', 'unsupported'],
        ['.filid/config.json', 'unsupported'],
      ]),
    );

    expect(result.filesOutsideFactsScope).toBe(0);
  });

  it('reports a count of zero when the scope covers every scanned file', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([]),
      states('exact'),
    );

    expect(result.filesOutsideFactsScope).toBe(0);
  });

  it('answers a scope that covers nothing with facts-uninitialized', async () => {
    const result = await collectDependencyReferences(
      ownership('/one'),
      '/one',
      facts([], { covers: [] }),
      states('unsupported'),
    );

    expect(result.certainty).toBe('unsupported');
    expect(result.references).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'facts-uninitialized',
        affects: ['dependencies', 'boundaries'],
      }),
    ]);
  });

  it('keeps ownership conflicts and unfollowed links attributed to their file', async () => {
    const resolution: AdapterResolution = {
      ...ownership('/one'),
      diagnostics: [
        {
          code: 'ambiguous-adapter-claim',
          message: 'two adapters claim this file',
          path: '/one/src/a.ts',
          nextAction: 'Name one adapter in adapters.enabled.',
        },
      ],
      unfollowedLinks: ['/one/src/linked'],
    };

    const result = await collectDependencyReferences(
      resolution,
      '/one',
      facts([]),
      states('exact'),
    );

    expect(result.unknownFiles).toEqual([
      { path: FILE, causes: ['ambiguous-adapter-claim'] },
      { path: 'src/linked', causes: ['symlink-not-followed'] },
    ]);
  });
});
