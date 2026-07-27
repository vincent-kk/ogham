import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  pathForCompare,
  portableJoin,
  portableRelative,
} from '@ogham/cross-platform/paths';
import { afterEach, describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  CONTRACT_INTENTS,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlacementRequest,
  RestructurePlan,
} from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/fractalTree.js';
import type { NodeEntry } from '../../tree/fractalTree/fractalTree.js';
import { createRestructurePlan } from '../index.js';

const PATHS = {
  ROOT: '/project',
  DOMAIN: '/project/domain',
  A: '/project/domain/a',
  B: '/project/domain/b',
  OTHER: '/project/other',
  SOURCE: '/project/domain/a/value.unit',
  SERVICE_SOURCE: '/project/domain/a/service.unit',
  A_CONSUMER: '/project/domain/a/use.unit',
  B_CONSUMER: '/project/domain/b/use.unit',
  OTHER_CONSUMER: '/project/other/use.unit',
  DOMAIN_TARGET: '/project/domain/model/value.unit',
  ROOT_TARGET: '/project/model/value.unit',
  SINGLE_TARGET: '/project/domain/a/model/value.unit',
  SERVICE_TARGET: '/project/domain/service/service.unit',
  OUTSIDE_SOURCE: '/outside/value.unit',
} as const;

const WINDOWS_PATHS = {
  ROOT: 'C:\\Repo',
  DOMAIN: 'C:\\Repo\\Domain',
  A: 'C:\\Repo\\Domain\\A',
  B: 'C:\\Repo\\Domain\\B',
  SOURCE_ALIAS: 'c:/repo/domain/a/value.unit',
  A_CONSUMER_ALIAS: 'c:/repo/domain/a/use.unit',
  B_CONSUMER: 'C:\\Repo\\Domain\\B\\use.unit',
  TARGET: 'C:\\Repo\\Domain\\model\\value.unit',
} as const;

const ENTRY_NAME = 'module.entry';
const ORGAN_HINT = 'model';
const SERVICE_HINT = 'service';
const CREATED_AT = '2026-07-27T00:00:00.000Z';
const SNAPSHOT_HASH = 'placement-snapshot';
const EMPTY_LIST: never[] = [];
const EXPECTED_ARTIFACT_ROLES = [
  REQUIRED_ARTIFACT_ROLES.INTENT_DOCUMENT,
  REQUIRED_ARTIFACT_ROLES.DETAIL_DOCUMENT,
  REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
];
const EXPECTED_INCOMING_CONSUMERS = [PATHS.A_CONSUMER, PATHS.B_CONSUMER];

const BASE_ENTRIES: NodeEntry[] = [
  {
    path: PATHS.ROOT,
    name: 'project',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(PATHS.ROOT, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
  },
  {
    path: PATHS.DOMAIN,
    name: 'domain',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(PATHS.DOMAIN, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
  },
  {
    path: PATHS.A,
    name: 'a',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(PATHS.A, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
    peerFiles: ['service.unit', 'use.unit', 'value.unit'],
  },
  {
    path: PATHS.B,
    name: 'b',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(PATHS.B, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
    peerFiles: ['use.unit'],
  },
  {
    path: PATHS.OTHER,
    name: 'other',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(PATHS.OTHER, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
    peerFiles: ['use.unit'],
  },
];

const WINDOWS_ENTRIES: NodeEntry[] = [
  {
    path: WINDOWS_PATHS.ROOT,
    name: 'Repo',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(WINDOWS_PATHS.ROOT, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
  },
  {
    path: WINDOWS_PATHS.DOMAIN,
    name: 'Domain',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [
      {
        path: portableJoin(WINDOWS_PATHS.DOMAIN, ENTRY_NAME),
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
  },
  {
    path: WINDOWS_PATHS.A,
    name: 'A',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles: ['use.unit', 'value.unit'],
  },
  {
    path: WINDOWS_PATHS.B,
    name: 'B',
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles: ['use.unit'],
  },
];

const REQUESTS = {
  SIBLINGS: {
    sourcePath: PATHS.SOURCE,
    consumerPaths: [PATHS.A_CONSUMER, PATHS.B_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
  THREE_CONSUMERS: {
    sourcePath: PATHS.SOURCE,
    consumerPaths: [PATHS.A_CONSUMER, PATHS.B_CONSUMER, PATHS.OTHER_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
  SINGLE_CONSUMER: {
    sourcePath: PATHS.SOURCE,
    consumerPaths: [PATHS.A_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
  INDEPENDENT: {
    sourcePath: PATHS.SERVICE_SOURCE,
    consumerPaths: [PATHS.A_CONSUMER, PATHS.B_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INDEPENDENT,
    organNameHint: SERVICE_HINT,
  },
  UNKNOWN_CONTRACT: {
    sourcePath: PATHS.SOURCE,
    consumerPaths: [PATHS.A_CONSUMER, PATHS.B_CONSUMER],
    contractIntent: CONTRACT_INTENTS.UNKNOWN,
    organNameHint: ORGAN_HINT,
  },
  NAME_REQUIRED: {
    sourcePath: PATHS.SOURCE,
    consumerPaths: [PATHS.A_CONSUMER, PATHS.B_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
  },
  INFER_CONSUMERS: {
    sourcePath: PATHS.SOURCE,
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
  OUTSIDE_SOURCE: {
    sourcePath: PATHS.OUTSIDE_SOURCE,
    consumerPaths: [PATHS.A_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
  WINDOWS: {
    sourcePath: WINDOWS_PATHS.SOURCE_ALIAS,
    consumerPaths: [WINDOWS_PATHS.A_CONSUMER_ALIAS, WINDOWS_PATHS.B_CONSUMER],
    contractIntent: CONTRACT_INTENTS.INTERNAL,
    organNameHint: ORGAN_HINT,
  },
} satisfies Record<string, PlacementRequest>;

const BASE_EDGES: ProjectSnapshot['dependencyGraph']['edges'] = [
  {
    fromFractalPath: PATHS.A,
    toFractalPath: PATHS.A,
    evidence: [
      {
        sourceFile: PATHS.A_CONSUMER,
        rawSpecifier: './value.unit',
        resolvedPath: PATHS.SOURCE,
      },
    ],
  },
  {
    fromFractalPath: PATHS.B,
    toFractalPath: PATHS.A,
    evidence: [
      {
        sourceFile: PATHS.B_CONSUMER,
        rawSpecifier: '../a/value.unit',
        resolvedPath: PATHS.SOURCE,
      },
    ],
  },
];

const TEMP_ROOTS: string[] = [];

function makeSnapshot(
  entries: NodeEntry[] = BASE_ENTRIES,
  certainty: ProjectSnapshot['dependencyGraph']['certainty'] = ANALYSIS_CERTAINTIES.EXACT,
): ProjectSnapshot {
  const tree = buildFractalTree(entries);
  return {
    schemaVersion: 1,
    projectRoot: tree.root,
    outputLanguage: 'ko',
    snapshotHash: SNAPSHOT_HASH,
    tree,
    dependencyGraph: {
      nodePaths: [...tree.nodes.keys()],
      edges: tree.root === PATHS.ROOT ? BASE_EDGES : [],
      cycles: [],
      certainty,
    },
    adapterIds: ['fixture'],
    verification: {
      files: [],
      violations: [],
      certainty: ANALYSIS_CERTAINTIES.EXACT,
    },
    legacyCriteriaLedger: null,
    diagnostics: [],
    createdAt: CREATED_AT,
  };
}

function planFor(
  snapshot: ProjectSnapshot,
  ...requests: PlacementRequest[]
): RestructurePlan {
  return createRestructurePlan(snapshot, {
    path: snapshot.projectRoot,
    requests,
  });
}

function manifest(directoryPath: string): string[] {
  const records: string[] = [];
  const visit = (currentPath: string): void => {
    for (const entry of readdirSync(currentPath, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      const path = portableJoin(currentPath, entry.name);
      const relative = portableRelative(directoryPath, path);
      if (entry.isDirectory()) {
        records.push(`${relative}/`);
        visit(path);
      } else records.push(`${relative}:${readFileSync(path, 'utf8')}`);
    }
  };
  visit(directoryPath);
  return records;
}

afterEach(() => {
  while (TEMP_ROOTS.length > 0) {
    const root = TEMP_ROOTS.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('read-only restructure placement', () => {
  it('places sibling consumers in an organ under their common fractal', () => {
    const move = planFor(makeSnapshot(), REQUESTS.SIBLINGS).moves[0];
    expect(move.targetPath).toBe(PATHS.DOMAIN_TARGET);
    expect(move.lowestCommonFractalPath).toBe(PATHS.DOMAIN);
    expect(move.targetNodeType).toBe(RESTRUCTURE_NODE_TYPES.ORGAN);
  });

  it('intersects all three consumer owners', () => {
    const move = planFor(makeSnapshot(), REQUESTS.THREE_CONSUMERS).moves[0];
    expect(move.targetPath).toBe(PATHS.ROOT_TARGET);
    expect(move.lowestCommonFractalPath).toBe(PATHS.ROOT);
  });

  it('places one consumer under its owner fractal', () => {
    const move = planFor(makeSnapshot(), REQUESTS.SINGLE_CONSUMER).moves[0];
    expect(move.targetPath).toBe(PATHS.SINGLE_TARGET);
    expect(move.lowestCommonFractalPath).toBe(PATHS.A);
  });

  it('plans an independent contract with three required artifact roles', () => {
    const move = planFor(makeSnapshot(), REQUESTS.INDEPENDENT).moves[0];
    expect(move.targetPath).toBe(PATHS.SERVICE_TARGET);
    expect(move.targetNodeType).toBe(RESTRUCTURE_NODE_TYPES.FRACTAL);
    expect(move.requiredArtifacts.map(({ role }) => role).sort()).toEqual(
      [...EXPECTED_ARTIFACT_ROLES].sort(),
    );
  });

  it('keeps an unknown contract unresolved without choosing an organ', () => {
    const plan = planFor(makeSnapshot(), REQUESTS.UNKNOWN_CONTRACT);
    expect(plan.moves).toEqual(EMPTY_LIST);
    expect(plan.unresolved[0].targetNodeType).toBe(
      RESTRUCTURE_NODE_TYPES.UNDETERMINED,
    );
    expect(plan.unresolved[0].decisionReasons).toContain(
      RESTRUCTURE_DECISION_REASONS.CONTRACT_INTENT_UNKNOWN,
    );
  });

  it('requires a meaningful organ name instead of inventing a grab-bag', () => {
    const move = planFor(makeSnapshot(), REQUESTS.NAME_REQUIRED).unresolved[0];
    expect(move.decisionReasons).toContain(
      RESTRUCTURE_DECISION_REASONS.ORGAN_NAME_REQUIRED,
    );
    expect(pathForCompare(move.targetPath)).not.toContain('/shared/');
    expect(pathForCompare(move.targetPath)).not.toContain('/common/');
  });

  it('derives omitted consumers and exact path-like rewrites from graph evidence', () => {
    const move = planFor(makeSnapshot(), REQUESTS.INFER_CONSUMERS).moves[0];
    expect(move.consumerPaths).toEqual(EXPECTED_INCOMING_CONSUMERS);
    expect(move.affectedImports).toHaveLength(2);
  });

  it('does not resolve inferred consumers from an indeterminate graph', () => {
    const move = planFor(
      makeSnapshot(BASE_ENTRIES, 'indeterminate'),
      REQUESTS.INFER_CONSUMERS,
    ).unresolved[0];
    expect(move.decisionReasons).toContain(
      RESTRUCTURE_DECISION_REASONS.DEPENDENCY_EVIDENCE_INDETERMINATE,
    );
  });

  it('keeps a source outside the snapshot root unresolved', () => {
    const move = planFor(makeSnapshot(), REQUESTS.OUTSIDE_SOURCE).unresolved[0];
    expect(move.decisionReasons).toContain(
      RESTRUCTURE_DECISION_REASONS.SOURCE_PATH_OUTSIDE_PROJECT,
    );
  });

  it('does not mutate a temporary project while planning', () => {
    const root = mkdtempSync(portableJoin(tmpdir(), 'filid-restructure-'));
    TEMP_ROOTS.push(root);
    const a = portableJoin(root, 'a');
    const b = portableJoin(root, 'b');
    mkdirSync(a, { recursive: true });
    mkdirSync(b, { recursive: true });
    const source = portableJoin(a, 'value.unit');
    const consumerA = portableJoin(a, 'use.unit');
    const consumerB = portableJoin(b, 'use.unit');
    writeFileSync(source, 'value', 'utf8');
    writeFileSync(consumerA, 'a', 'utf8');
    writeFileSync(consumerB, 'b', 'utf8');
    const entries: NodeEntry[] = [
      {
        path: root,
        name: 'root',
        type: NODE_TYPES.FRACTAL,
        hasIntentMd: true,
        hasDetailMd: true,
      },
      {
        path: a,
        name: 'a',
        type: NODE_TYPES.FRACTAL,
        hasIntentMd: true,
        hasDetailMd: true,
        peerFiles: ['use.unit', 'value.unit'],
      },
      {
        path: b,
        name: 'b',
        type: NODE_TYPES.FRACTAL,
        hasIntentMd: true,
        hasDetailMd: true,
        peerFiles: ['use.unit'],
      },
    ];
    const before = manifest(root);
    planFor(makeSnapshot(entries), {
      sourcePath: source,
      consumerPaths: [consumerA, consumerB],
      contractIntent: CONTRACT_INTENTS.INTERNAL,
      organNameHint: ORGAN_HINT,
    });
    expect(manifest(root)).toEqual(before);
  });

  it('preserves canonical Windows targets across separator and case aliases', () => {
    const move = planFor(makeSnapshot(WINDOWS_ENTRIES), REQUESTS.WINDOWS)
      .moves[0];
    expect(move.targetPath).toBe(WINDOWS_PATHS.TARGET);
    expect(move.lowestCommonFractalPath).toBe(WINDOWS_PATHS.DOMAIN);
  });
});
