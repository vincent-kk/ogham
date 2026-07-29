import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  FractalNode,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import { buildImportRewrites } from '../imports/buildImportRewrites.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { stripPathExtension } from '../specifiers/stripPathExtension.js';
import { validateImportRewrites } from '../validator/validateImportRewrites.js';

const PATHS = {
  ROOT: '/root',
  FEATURE_A: '/root/featureA',
  FEATURE_A_FILE: '/root/featureA/index.ts',
  FEATURE_B: '/root/featureB',
  FEATURE_B_FILE: '/root/featureB/index.ts',
  SOURCE: '/root/lib/logger.ts',
  TARGET: '/root/shared/logger.ts',
  DIRECTORY_INDEX: '/root/lib/index.ts',
  SOURCE_DIRECTORY: '/root/lib',
  TARGET_DIRECTORY: '/root/shared',
  NESTED_CONSUMER: '/root/lib/deep/consumer.ts',
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
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-07-28T00:00:00.000Z',
  };
}

describe('import specifier rewrites under ecosystem extension conventions', () => {
  it('rewrites a .js specifier that resolves to a .ts source', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib/logger.js',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      PATHS.SOURCE,
      PATHS.TARGET,
      [PATHS.FEATURE_A_FILE],
    );

    expect(result.decisionReasons).toEqual([]);
    expect(result.rewrites).toEqual([
      {
        consumerPath: PATHS.FEATURE_A_FILE,
        currentSpecifier: '../lib/logger.js',
        requiredSpecifier: '../shared/logger.js',
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
      PATHS.SOURCE,
      PATHS.TARGET,
      [PATHS.FEATURE_A_FILE],
    );

    expect(result.decisionReasons).toEqual([]);
    expect(result.rewrites[0]?.requiredSpecifier).toBe('../shared/logger');
  });

  it('leaves a directory-index specifier unsupported', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '../lib',
          resolvedPath: PATHS.DIRECTORY_INDEX,
        },
      ]),
      PATHS.DIRECTORY_INDEX,
      PATHS.TARGET,
      [PATHS.FEATURE_A_FILE],
    );

    expect(result.rewrites).toEqual([]);
    expect(result.decisionReasons).toEqual([
      RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED,
    ]);
  });

  it('accepts a post-move .js specifier as postcondition evidence', () => {
    const findings = validateImportRewrites(
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
            requiredSpecifier: '../shared/logger.js',
          },
        ],
        requiresDecision: false,
        decisionReasons: [],
      },
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
    expect(stripPathExtension('/root/lib/.gitignore')).toBe(
      '/root/lib/.gitignore',
    );
  });

  it('leaves a bare parent-directory specifier unsupported', () => {
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
      PATHS.SOURCE_DIRECTORY,
      PATHS.TARGET_DIRECTORY,
      [PATHS.NESTED_CONSUMER],
    );

    expect(result.rewrites).toEqual([]);
    expect(result.decisionReasons).toEqual([
      RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED,
    ]);
  });

  it('still rejects a bare package specifier', () => {
    const result = buildImportRewrites(
      snapshotWith([
        {
          sourceFile: PATHS.FEATURE_A_FILE,
          rawSpecifier: '@scope/logger',
          resolvedPath: PATHS.SOURCE,
        },
      ]),
      PATHS.SOURCE,
      PATHS.TARGET,
      [PATHS.FEATURE_A_FILE],
    );

    expect(result.rewrites).toEqual([]);
    expect(result.decisionReasons).toEqual([
      RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED,
    ]);
  });
});
