import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  FractalNode,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import { buildImportRewrites } from '../imports/buildImportRewrites.js';
import { formatRequiredSpecifier } from '../imports/formatRequiredSpecifier.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { stripPathExtension } from '../specifiers/stripPathExtension.js';
import { validateImportRequirements } from '../validator/validateImportRequirements.js';

const PATHS = {
  ROOT: '/filid-fixture-root',
  FEATURE_A: '/filid-fixture-root/featureA',
  FEATURE_A_FILE: '/filid-fixture-root/featureA/index.ts',
  FEATURE_B: '/filid-fixture-root/featureB',
  FEATURE_B_FILE: '/filid-fixture-root/featureB/index.ts',
  SOURCE: '/filid-fixture-root/lib/logger.ts',
  TARGET: '/filid-fixture-root/shared/logger.ts',
  DIRECTORY_INDEX: '/filid-fixture-root/lib/index.ts',
  SOURCE_DIRECTORY: '/filid-fixture-root/lib',
  TARGET_DIRECTORY: '/filid-fixture-root/shared',
  NESTED_CONSUMER: '/filid-fixture-root/lib/deep/consumer.ts',
} as const;

function node(path: string, name: string, depth: number): FractalNode {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    parent: depth === 0 ? null : PATHS.ROOT,
    parentFractalPath: depth === 0 ? null : PATHS.ROOT,
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [],
    peerFiles: [],
    hasIndex: false,
    hasMain: false,
    depth,
    metadata: {},
  };
}

function unit(sourcePath: string, targetPath: string) {
  return { sourcePath, targetPath, rewriteTargetPath: targetPath };
}

function snapshotWith(evidence: DependencyEvidence[]): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: PATHS.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'specifier-fixture',
    tree: {
      root: PATHS.ROOT,
      nodes: new Map([
        [PATHS.ROOT, node(PATHS.ROOT, 'root', 0)],
        [PATHS.FEATURE_A, node(PATHS.FEATURE_A, 'featureA', 1)],
        [PATHS.FEATURE_B, node(PATHS.FEATURE_B, 'featureB', 1)],
        [PATHS.SOURCE_DIRECTORY, node(PATHS.SOURCE_DIRECTORY, 'lib', 1)],
      ]),
      depth: 1,
      totalNodes: 4,
    },
    dependencyGraph: {
      nodePaths: [PATHS.ROOT, PATHS.FEATURE_A, PATHS.FEATURE_B],
      edges: [
        {
          fromFractalPath: PATHS.FEATURE_A,
          toFractalPath: PATHS.ROOT,
          evidence,
        },
      ],
      cycles: [],
      unknownFiles: [],
      certainty: ANALYSIS_CERTAINTIES.EXACT,
    },
    adapterIds: ['fixture-adapter'],
    verification: {
      files: [],
      violations: [],
      certainty: ANALYSIS_CERTAINTIES.EXACT,
    },
    legacyCriteriaLedger: null,
    diagnostics: [],
    normalizedFacts: [],
    filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-07-28T00:00:00.000Z',
  };
}

describe('suggested specifiers under ecosystem extension conventions', () => {
  it('suggests a .js specifier for one that resolves to a .ts source', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib/logger.js',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      unit(PATHS.SOURCE, PATHS.TARGET),
    );

    expect(result.required).toEqual([
      {
        consumerPath: PATHS.FEATURE_A_FILE,
        currentSpecifier: '../lib/logger.js',
        requiredResolvedPath: PATHS.TARGET,
        suggestedSpecifier: '../shared/logger.js',
      },
    ]);
  });

  it('keeps an extensionless specifier extensionless', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib/logger',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      unit(PATHS.SOURCE, PATHS.TARGET),
    );

    expect(result.required[0]?.suggestedSpecifier).toBe('../shared/logger');
  });

  it('requires a directory-index specifier without a suggestion', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib',
          resolvedPath: PATHS.DIRECTORY_INDEX,
        },
      ]),
      unit(PATHS.DIRECTORY_INDEX, PATHS.TARGET),
    );

    expect(result.required).toEqual([
      {
        consumerPath: PATHS.FEATURE_A_FILE,
        currentSpecifier: '../lib',
        requiredResolvedPath: PATHS.TARGET,
      },
    ]);
  });

  it('accepts a post-move .js specifier that resolves to the required file', () => {
    const findings = validateImportRequirements(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../shared/logger.js',
          resolvedPath: PATHS.TARGET,
        },
      ]),
      {
        sourcePath: PATHS.SOURCE,
        targetPath: PATHS.TARGET,
        unitKind: 'file',
        targetNodeType: 'organ',
        basis: 'lowest-common-fractal',
        consumerPaths: [PATHS.FEATURE_A_FILE],
        reason: 'moved',
        requiredArtifacts: [],
        affectedImports: [
          {
            consumerPath: PATHS.FEATURE_A_FILE,
            currentSpecifier: '../lib/logger.js',
            requiredResolvedPath: PATHS.TARGET,
            suggestedSpecifier: '../shared/logger.js',
          },
        ],
        preservedImports: [],
        requiresDecision: false,
        decisionReasons: [],
        decisions: [],
      },
      new Map(),
    );

    expect(findings).toEqual([]);
  });

  it('accepts a post-move directory reference that resolves to the required file', () => {
    const findings = validateImportRequirements(
      snapshotWith([
        {
          sourceFile: PATHS.TARGET,
          rawSpecifier: '../featureA',
          resolvedPath: PATHS.FEATURE_A_FILE,
        },
      ]),
      {
        sourcePath: PATHS.SOURCE,
        targetPath: PATHS.TARGET,
        unitKind: 'file',
        targetNodeType: 'organ',
        basis: 'lowest-common-fractal',
        consumerPaths: [PATHS.FEATURE_A_FILE],
        reason: 'moved',
        requiredArtifacts: [],
        affectedImports: [
          {
            consumerPath: PATHS.TARGET,
            currentSpecifier: '../featureA',
            requiredResolvedPath: PATHS.FEATURE_A_FILE,
            suggestedSpecifier: '../featureA',
          },
        ],
        preservedImports: [],
        requiresDecision: false,
        decisionReasons: [],
        decisions: [],
      },
      new Map(),
    );

    expect(findings).toEqual([]);
  });

  it('keeps a move with real consumer edges out of unresolved', () => {
    const plan = createRestructurePlan(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib/logger.js',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      {
        path: PATHS.ROOT,
        requests: [
          {
            sourcePath: PATHS.SOURCE,
            consumerPaths: [PATHS.FEATURE_A_FILE],
            contractIntent: 'internal',
            organNameHint: 'shared',
          },
        ],
      },
    );

    expect(plan.unresolved).toEqual([]);
    expect(plan.moves).toHaveLength(1);
    expect(plan.moves[0]?.affectedImports).toHaveLength(1);
  });

  it('treats a dot-only segment as a relative marker, not an extension', () => {
    expect(stripPathExtension('..')).toBe('..');
    expect(stripPathExtension('../..')).toBe('../..');
    expect(stripPathExtension('.')).toBe('.');
    expect(stripPathExtension('/filid-fixture-root/lib/.gitignore')).toBe(
      '/filid-fixture-root/lib/.gitignore',
    );
  });

  it('preserves a bare parent-directory specifier the directory move keeps valid', () => {
    // '..' 은 path-like 판정에서 탈락해야 한다. 통과시키면 stripPathExtension이
    // '..' 을 이름+확장자로 읽어 '../../shared.' 같은 specifier를 만들어 낸다.
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.NESTED_CONSUMER,
          rawSpecifier: '..',
          resolvedPath: PATHS.SOURCE_DIRECTORY,
        },
      ]),
      unit(PATHS.SOURCE_DIRECTORY, PATHS.TARGET_DIRECTORY),
    );

    expect(result.required).toEqual([]);
    expect(result.preserved).toEqual([
      {
        consumerPath: '/filid-fixture-root/shared/deep/consumer.ts',
        currentSpecifier: '..',
        requiredResolvedPath: PATHS.TARGET_DIRECTORY,
      },
    ]);
  });

  it('requires a bare package specifier without a suggestion', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '@scope/logger',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      unit(PATHS.SOURCE, PATHS.TARGET),
    );

    expect(result.required).toEqual([
      {
        consumerPath: PATHS.FEATURE_A_FILE,
        currentSpecifier: '@scope/logger',
        requiredResolvedPath: PATHS.TARGET,
      },
    ]);
  });
});

describe('a specifier computed from Windows paths', () => {
  it('is separated the way a module specifier is, not the way the host is', () => {
    expect(
      formatRequiredSpecifier(
        'C:\\Repo\\domain\\a\\use.ts',
        'C:\\Repo\\domain\\model\\value.ts',
        './value.js',
        'file',
      ),
    ).toBe('../model/value.js');
  });
});
