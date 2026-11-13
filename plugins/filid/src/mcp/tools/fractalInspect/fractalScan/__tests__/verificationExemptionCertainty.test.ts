import { describe, expect, it, vi } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../../../constants/snapshotAxes.js';
import { loadBuiltinRules } from '../../../../../core/rules/ruleEngine/index.js';
import { analyzeVerification } from '../../../../../core/verification/index.js';
import type {
  AnalysisCertainty,
  FractalNode,
  ProjectSnapshot,
} from '../../../../../types/fractal.js';
import type { RuleOverride } from '../../../../../types/rules.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';
import type { VerificationFileFacts } from '../../../../../types/verification.js';
import { createToolSnapshot } from '../../../utils/createToolSnapshot.js';
import { handleFractalScan } from '../fractalScan.js';

vi.mock('../../../utils/createToolSnapshot.js', () => ({
  createToolSnapshot: vi.fn(),
}));

/** @param overrides Configuration for actual verification rules. @param counts Per-file count certainty. @param discovery Independent discovery certainty. @param graph Dependency graph certainty. @param diagnostics Whole-project blockers. @returns A full scan over production policy and rule evaluation. */
async function scan(
  overrides: Record<string, RuleOverride> = {},
  counts: AnalysisCertainty[] = ['indeterminate'],
  discovery: AnalysisCertainty = 'exact',
  graph: AnalysisCertainty = 'exact',
  diagnostics: ToolDiagnostic[] = [],
) {
  const records = new Map<string, VerificationFileFacts>(
    counts.map((certainty, index) => [
      index === 0 ? '/project/record.unit' : '/project/other.unit',
      {
        role: 'test-record',
        cases: { certainty, knownLowerBound: 1, reasons: ['fixture count'] },
      },
    ]),
  );
  const node: FractalNode = {
    path: '/project',
    name: 'project',
    type: 'fractal',
    parent: null,
    parentFractalPath: null,
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: true,
    hasDetailMd: false,
    entryPoints: [],
    peerFiles: [],
    hasIndex: false,
    hasMain: false,
    depth: 0,
    metadata: {},
  };
  const verification = await analyzeVerification({
    projectRoot: '/project',
    adapters: [
      {
        id: 'fixture',
        detect: async () => ({ confidence: 1, evidence: [] }),
        discover: async () => [...records.keys()],
      },
    ],
    discoveredPathsByAdapter: new Map([['fixture', [...records.keys()]]]),
    verificationFacts: records,
    ownerFractalPath: () => '/project',
    discoveryCertainty: discovery,
  });
  const snapshot: ProjectSnapshot = {
    schemaVersion: 1,
    projectRoot: '/project',
    outputLanguage: 'en',
    snapshotHash: 'fixture',
    adapterIds: ['fixture'],
    tree: {
      root: '/project',
      nodes: new Map([['/project', node]]),
      depth: 0,
      totalNodes: 1,
    },
    dependencyGraph: {
      nodePaths: ['/project'],
      edges: [],
      cycles: [],
      unknownFiles: [],
      certainty: graph,
    },
    verificationPaths: [...records.keys()],
    verification,
    legacyCriteriaLedger: null,
    diagnostics: [],
    normalizedFacts: [],
    filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-01-01T00:00:00Z',
  };
  vi.mocked(createToolSnapshot).mockResolvedValue({
    snapshot,
    ignore: [],
    maxDepth: 10,
    diagnostics,
    rules: loadBuiltinRules(overrides).filter(
      (rule) => rule.scope === 'verification',
    ),
  });
  const result = await handleFractalScan({ path: '/project', detail: 'full' });
  const data = result.data;
  if (!data || !('snapshot' in data))
    throw new Error('Expected full scan evidence');
  return { ...result, data };
}

describe('scan verification certainty: regressions', () => {
  it('exempts the only uncertain count while retaining raw full-detail evidence', async () => {
    const result = await scan({
      'test-record-case-cap': { exempt: ['/project/record.unit'] },
    });
    expect(result.status).toBe('ok');
    expect(result.summary).toMatchObject({
      violationCount: 0,
      certainty: 'exact',
    });
    expect(result.data.validation.result.violations).toEqual([
      expect.objectContaining({
        severity: 'info',
        exemptedBy: '/project/record.unit',
      }),
    ]);
    expect(result.data.snapshot.verification.violations).toEqual([
      expect.objectContaining({
        severity: 'warning',
        certainty: 'indeterminate',
      }),
    ]);
    expect(result.data.snapshot.verification.certainty).toBe('indeterminate');
  });
  it('preserves discovery uncertainty when every file is exempt', async () => {
    const overrides = Object.fromEntries(
      [
        'spec-document-case-cap',
        'test-record-case-cap',
        'spec-fragmentation',
        'spec-contract-link',
      ].map((id) => [id, { exempt: ['/project/*.unit'] }]),
    );
    const result = await scan(overrides, ['indeterminate'], 'indeterminate');
    expect(result.status).toBe('indeterminate');
    expect(result.summary.certainty).toBe('indeterminate');
    expect(result.data.validation.result.violations).toContainEqual(
      expect.objectContaining({ path: '/project', certainty: 'indeterminate' }),
    );
  });
});

describe('scan verification certainty: controls', () => {
  it('stays indeterminate without rule configuration', async () => {
    const result = await scan();
    expect(result.status).toBe('indeterminate');
    expect(result.summary).toMatchObject({
      violationCount: 1,
      certainty: 'indeterminate',
    });
  });
  it('preserves uncertainty of a second nonexempt file', async () => {
    const result = await scan(
      { 'test-record-case-cap': { exempt: ['/project/record.unit'] } },
      ['indeterminate', 'indeterminate'],
    );
    expect(result.status).toBe('indeterminate');
    expect(result.summary).toMatchObject({
      violationCount: 1,
      certainty: 'indeterminate',
    });
  });
  it('preserves unsupported status when both measured axes are unsupported', async () => {
    const result = await scan({}, ['unsupported'], 'exact', 'unsupported');
    expect(result.status).toBe('unsupported');
    expect(result.summary.certainty).toBe('unsupported');
  });
  it('preserves a blocking dependency diagnostic despite count exemptions', async () => {
    const result = await scan(
      { 'test-record-case-cap': { exempt: ['/project/record.unit'] } },
      ['indeterminate'],
      'exact',
      'exact',
      [
        {
          code: 'unresolved-local-dependency',
          message: 'Dependency evidence is incomplete.',
          affects: ['dependencies'],
          nextAction: 'Refresh dependency facts.',
        },
      ],
    );
    expect(result.status).toBe('indeterminate');
    expect(result.summary).toMatchObject({
      violationCount: 0,
      certainty: 'indeterminate',
    });
  });
});
