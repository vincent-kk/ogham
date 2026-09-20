import { describe, expect, it } from 'vitest';

import { FACTS_SECTION_UNAVAILABLE_NEXT_ACTION } from '../../../constants/facts.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { validateImportRequirements } from '../../../core/restructure/validator/validateImportRequirements.js';
import { validateRequiredArtifacts } from '../../../core/restructure/validator/validateRequiredArtifacts.js';
import type {
  FractalNode,
  FractalTree,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { MoveInstruction } from '../../../types/restructure.js';

/** The consumer whose stored facts claim an import it does not hold. */
const CONSUMER = '/project/left/use.ts';

/** The specifier the stored record claims for that consumer. */
const SPECIFIER = './moved.js';

const node: FractalNode = {
  path: '/project/left',
  name: 'left',
  type: 'fractal',
  parent: '/project',
  parentFractalPath: '/project',
  children: [],
  childFractalPaths: [],
  organs: [],
  organPaths: [],
  hasIntentMd: true,
  hasDetailMd: true,
  entryPoints: [
    {
      path: '/project/left/index.ts',
      kind: 'module',
      adapterId: 'fixture',
      surface: 'unsupported',
    },
  ],
  peerFiles: ['index.ts'],
  hasIndex: true,
  hasMain: false,
  depth: 1,
  metadata: {},
};

const tree: FractalTree = {
  root: '/project',
  nodes: new Map([['/project/left', node]]),
  depth: 1,
  totalNodes: 1,
};

/** A snapshot with no edges, so every import requirement misses. */
const snapshot: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: '/project',
  outputLanguage: 'English',
  snapshotHash: 'fixture',
  tree,
  dependencyGraph: {
    nodePaths: ['/project/left'],
    edges: [],
    cycles: [],
    unknownFiles: [],
    certainty: 'exact',
  },
  adapterIds: ['fixture'],
  verification: { files: [], violations: [], certainty: 'exact' },
  legacyCriteriaLedger: null,
  diagnostics: [],
  normalizedFacts: [],
  filesOutsideFactsScope: 0,
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: '2026-09-20T00:00:00.000Z',
};

/**
 * One move whose consumer must load the moved file after execution.
 * @param entryPointRequired Whether the move also requires the entry point.
 * @returns The instruction the validators read.
 */
function move(entryPointRequired = false): MoveInstruction {
  return {
    sourcePath: '/project/left/moved.ts',
    targetPath: '/project/moved.ts',
    unitKind: 'file',
    targetNodeType: 'organ',
    basis: 'lowest-common-fractal',
    consumerPaths: [CONSUMER],
    reason: 'fixture',
    requiredArtifacts: entryPointRequired
      ? [
          {
            role: 'entry-point',
            path: '/project/left/index.ts',
            adapterId: 'fixture',
          },
        ]
      : [],
    affectedImports: [
      {
        consumerPath: CONSUMER,
        currentSpecifier: SPECIFIER,
        requiredResolvedPath: '/project/moved.ts',
      },
    ],
    preservedImports: [],
    requiresDecision: false,
    decisionReasons: [],
    decisions: [],
  };
}

describe('a restructure finding about facts asks for facts, not for a person', () => {
  it('sends a misread reference to adjudicate dismiss with everything that call needs', () => {
    const [finding] = validateImportRequirements(
      snapshot,
      move(),
      new Map([[CONSUMER, new Set(['/project/moved.ts'])]]),
    );

    // The two values `facts status` is looked up by; the rest of the
    // `adjudicate` call is on the item it returns for this path (P5).
    expect(finding?.nextAction).toContain(CONSUMER);
    expect(finding?.nextAction).toContain(SPECIFIER);
    expect(finding?.nextAction).toContain('facts adjudicate');
    expect(finding?.nextAction).toContain('coverage-shrank');
    expect(finding?.nextAction).toContain('different actor');
    expect(finding?.nextAction).not.toContain('to the user');
  });

  it('sends an entry point with no stated exports to the record that states them', () => {
    const [finding] = validateRequiredArtifacts(move(true), node);

    expect(finding?.code).toBe('entry-point-surface-unsupported');
    expect(finding?.nextAction).toContain(
      FACTS_SECTION_UNAVAILABLE_NEXT_ACTION,
    );
    expect(finding?.nextAction).toContain('attested record');
    expect(finding?.nextAction).not.toContain('by hand');
  });
});
