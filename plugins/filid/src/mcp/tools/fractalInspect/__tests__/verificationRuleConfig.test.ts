import { describe, expect, it, vi } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import { analyzeVerification } from '../../../../core/verification/index.js';
import { loadBuiltinRules } from '../../../../core/rules/ruleEngine/index.js';
import type { AnalysisCertainty, FractalNode, ProjectSnapshot } from '../../../../types/fractal.js';
import type { RuleOverride } from '../../../../types/rules.js';
import type { VerificationFileFacts } from '../../../../types/verification.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { handleStructureValidate } from '../structureValidate/index.js';
import { handleVerificationScan } from '../verificationScan/index.js';

vi.mock('../../utils/createToolSnapshot.js', () => ({ createToolSnapshot: vi.fn() }));

/** Default records exercise exact spec evidence beside an uncertain test record. */
const BASE_RECORDS: Record<string, VerificationFileFacts> = {
  '/project/spec.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] }, contractGroupIds: [] },
  '/project/record.unit': { role: 'test-record', cases: { certainty: 'indeterminate', knownLowerBound: 1, reasons: ['dynamic count'] } },
};

/** @param overrides Config applied through the actual built-in roster. @param records Facts analyzed by the production analyzer. @param discoveryCertainty Independent discovery confidence. @param filePaths Optional evidence filter. @returns Both handlers over the same configured snapshot. */
async function inspect(
  overrides: Record<string, RuleOverride> = {},
  records = BASE_RECORDS,
  discoveryCertainty: AnalysisCertainty = 'exact',
  filePaths?: string[],
) {
  const node: FractalNode = {
    path: '/project', name: 'project', type: 'fractal', parent: null, parentFractalPath: null,
    children: [], childFractalPaths: [], organs: [], organPaths: [], hasIntentMd: true,
    hasDetailMd: false, entryPoints: [], peerFiles: [], hasIndex: false, hasMain: false, depth: 0, metadata: {},
  };
  const verification = await analyzeVerification({
    projectRoot: '/project', adapters: [{ id: 'fixture', detect: async () => ({ confidence: 1, evidence: [] }), discover: async () => Object.keys(records) }],
    discoveredPathsByAdapter: new Map([['fixture', Object.keys(records)]]),
    ownerFractalPath: () => '/project', verificationFacts: new Map(Object.entries(records)), discoveryCertainty,
    detailDocuments: [{ ownerFractalPath: '/project', path: '/project/DETAIL.md', content: '## Acceptance Criteria\n\n### AC-one — first\n\n### AC-two — second' }],
  });
  const snapshot: ProjectSnapshot = {
    schemaVersion: 1, projectRoot: '/project', outputLanguage: 'en', snapshotHash: 'fixture', adapterIds: ['fixture'],
    tree: { root: node.path, nodes: new Map([[node.path, node]]), depth: 0, totalNodes: 1 },
    dependencyGraph: { nodePaths: [node.path], edges: [], cycles: [], unknownFiles: [], certainty: 'exact' },
    verificationPaths: Object.keys(records), verification, legacyCriteriaLedger: null, diagnostics: [], normalizedFacts: [],
    filesOutsideFactsScope: 0, collectedAxes: ALL_SNAPSHOT_AXES, createdAt: '2026-01-01T00:00:00Z',
  };
  vi.mocked(createToolSnapshot).mockResolvedValue({ snapshot, ignore: [], rules: loadBuiltinRules(overrides), maxDepth: 10, diagnostics: [] });
  const validate = await handleStructureValidate({ path: '/project', scopes: ['verification'] });
  const scan = await handleVerificationScan({ path: '/project', detail: 'files', filePaths });
  return { validate, scan, verification };
}

describe('verification config: regressions', () => {
  it('exempts uncertain counts in both actions while retaining visible info', async () => {
    const { validate, scan, verification } = await inspect({ 'test-record-case-cap': { exempt: ['/project/record.unit'] } });
    expect(validate.status).toBe('ok');
    expect(scan.status).toBe('ok');
    expect(scan.data?.violations).toEqual(validate.data?.result.violations);
    expect(scan.data?.violations).toEqual([expect.objectContaining({ severity: 'info', exemptedBy: '/project/record.unit' })]);
    expect(scan.summary).toMatchObject({ exemptedCount: 1, violationCount: 0, certainty: 'exact' });
    expect(scan.data?.files).toEqual(verification.files);
    expect(verification).toHaveProperty('discoveryCertainty', 'exact');
  });
  it('does not invent spec root uncertainty from test-record counts', async () => {
    const { validate } = await inspect();
    expect(validate.data?.result.violations.filter((v) => ['spec-contract-link', 'spec-fragmentation'].includes(v.ruleId))).toEqual([]);
  });
  it('omits disabled-rule findings from the verification action', async () => {
    const { scan } = await inspect({ 'test-record-case-cap': { enabled: false } });
    expect(scan.data?.violations.filter((v) => v.ruleId === 'test-record-case-cap')).toEqual([]);
  });
  it('applies severity overrides to verification findings', async () => {
    const { scan } = await inspect({ 'spec-contract-link': { severity: 'error' } }, {
      '/project/record.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] } },
      '/project/spec.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] } },
    });
    expect(scan.data?.violations[0]).toMatchObject({ severity: 'error' });
  });
  it('evaluates exemption outside severity overrides identically in both actions', async () => {
    const { validate, scan } = await inspect({ 'spec-contract-link': { severity: 'error', exempt: ['/project/record.unit'] } }, {
      '/project/record.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] } },
      '/project/spec.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] } },
    });
    expect(scan.data?.violations).toEqual(validate.data?.result.violations);
    expect(scan.data?.violations[0]).toMatchObject({ severity: 'info', exemptedBy: '/project/record.unit' });
  });
  it('counts only actual violations when mixed with exemptions', async () => {
    const records: Record<string, VerificationFileFacts> = {
      '/project/a.unit': { ...BASE_RECORDS['/project/spec.unit']!, contractGroupIds: ['AC-one'] },
      '/project/b.unit': { ...BASE_RECORDS['/project/spec.unit']!, contractGroupIds: ['AC-one'] },
      '/project/c.unit': { ...BASE_RECORDS['/project/spec.unit']!, contractGroupIds: ['AC-one'] },
    };
    const { validate, scan } = await inspect({ 'spec-fragmentation': { exempt: ['/project/b.unit'] } }, records);
    expect(validate.status).toBe('violations');
    expect(scan.status).toBe('violations');
    expect(scan.summary).toMatchObject({ exemptedCount: 1, violationCount: 1, fragmentationCount: 1 });
    expect(scan.data?.violations).toEqual(validate.data?.result.violations);
  });
  it('keeps discovery uncertainty when every rule also has exempt file findings', async () => {
    const records: Record<string, VerificationFileFacts> = {
      '/project/a.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 16, reasons: [] }, contractGroupIds: ['missing'] },
      '/project/b.unit': { role: 'spec-document', cases: { certainty: 'exact', exactCount: 16, reasons: [] }, contractGroupIds: ['missing'] },
      '/project/record.unit': BASE_RECORDS['/project/record.unit']!,
    };
    const overrides = Object.fromEntries(['spec-document-case-cap', 'test-record-case-cap', 'spec-fragmentation', 'spec-contract-link'].map((id) => [id, { exempt: ['/project/*.unit'] }]));
    const { validate, scan } = await inspect(overrides, records, 'indeterminate');
    expect([validate.status, scan.status]).toEqual(['indeterminate', 'indeterminate']);
    for (const id of Object.keys(overrides)) {
      expect(scan.data?.violations).toContainEqual(expect.objectContaining({ ruleId: id, path: '/project', certainty: 'indeterminate' }));
      expect(scan.data?.violations).toContainEqual(expect.objectContaining({ ruleId: id, severity: 'info' }));
    }
  });
  it('reports root exemptions identically in both actions', async () => {
    const overrides = Object.fromEntries(['spec-document-case-cap', 'test-record-case-cap', 'spec-fragmentation', 'spec-contract-link'].map((id) => [id, { exempt: ['/project'] }]));
    const { validate, scan } = await inspect(overrides);
    expect(scan.data?.violations).toEqual(validate.data?.result.violations);
  });
});

describe('verification config: intended behavior changes', () => {
  it('passes both actions when the only uncertain count rule is disabled', async () => {
    const { validate, scan } = await inspect({ 'test-record-case-cap': { enabled: false } }, { '/project/record.unit': BASE_RECORDS['/project/record.unit']! });
    expect([validate.status, scan.status]).toEqual(['ok', 'ok']);
  });
  it('reports unknown spec declarations as indeterminate even with exact counts and no config', async () => {
    const facts: VerificationFileFacts = { role: 'spec-document', cases: { certainty: 'exact', exactCount: 1, reasons: [] } };
    const { validate, scan } = await inspect({}, { '/project/a.unit': facts, '/project/b.unit': facts });
    expect(validate.status).toBe('indeterminate');
    expect(scan.status).toBe('indeterminate');
    expect(scan.summary.certainty).toBe('indeterminate');
  });
});

describe('verification config: controls', () => {
  it('remains indeterminate without config', async () => {
    const { validate, scan } = await inspect();
    expect([validate.status, scan.status]).toEqual(['indeterminate', 'indeterminate']);
  });
  it('preserves uncertainty of another nonexempt file', async () => {
    const { validate, scan } = await inspect({ 'test-record-case-cap': { exempt: ['/project/record.unit'] } }, { ...BASE_RECORDS, '/project/other.unit': BASE_RECORDS['/project/record.unit']! });
    expect([validate.status, scan.status]).toEqual(['indeterminate', 'indeterminate']);
  });
  it('preserves unsupported evidence of another nonexempt file', async () => {
    const { validate, scan } = await inspect({ 'test-record-case-cap': { exempt: ['/project/record.unit'] } }, { ...BASE_RECORDS, '/project/other.unit': { role: 'test-record', cases: { certainty: 'unsupported', reasons: ['unsupported count'] } } });
    expect([validate.status, scan.status]).toEqual(['unsupported', 'unsupported']);
  });

  it('computes project certainty before filtering to an exact file', async () => {
    const { scan } = await inspect({}, BASE_RECORDS, 'exact', ['/project/spec.unit']);
    expect(scan.status).toBe('indeterminate');
    expect(scan.summary.certainty).toBe('indeterminate');
    expect(scan.data?.files.map((f) => f.path)).toEqual(['/project/spec.unit']);
  });
  it('preserves missing-path indeterminate precedence', async () => {
    const { scan } = await inspect({}, BASE_RECORDS, 'exact', ['/project/absent.unit']);
    expect(scan.status).toBe('indeterminate');
    expect(scan.diagnostics).toContainEqual(expect.objectContaining({ code: 'verification-path-not-found' }));
  });

});
