import { describe, expect, it } from 'vitest';

import { FilidConfigSchema } from '../../../../core/infra/configLoader/index.js';
import { buildFractalTree } from '../../../../core/tree/fractalTree/index.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { assessReviewGroupRisk } from '../../../../mcp/tools/reviewState/group/assessReviewGroupRisk.js';
import { classifyChangedFile } from '../../../../mcp/tools/reviewState/scope/classifyChangedFile.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

describe('review risk evidence', () => {
  it.each([
    ['src/auth/check.ts', 'security-path'],
    ['src/authorizePermission.ts', 'security-path'],
    ['src/RBAC_policy.py', 'security-path'],
    ['src/JWTValidator.ts', 'security-path'],
    ['src/useRBACPolicy.ts', 'security-path'],
    ['src/useMutex.rs', 'concurrency-path'],
    ['src/transactions/write.go', 'concurrency-path'],
    ['src/value.ts', null],
    ['src/author.ts', null],
    ['src/clock.ts', null],
    ['src/tokenizer.ts', null],
  ])('classifies complete path words in %s', (path, reason) => {
    const input = buildReviewBriefInput();
    input.group.units = [{ ...input.group.units[0]!, path: path! }];
    input.files = [{ ...input.files[0]!, path: path! }];
    const reasons = assessReviewGroupRisk({ ...input, highRiskPaths: [] });
    expect(reasons).toEqual(reason ? [`${reason}: ${path}`] : []);
  });

  it.each(['verification', 'document', 'generated'] as const)(
    'does not escalate %s files matching a sensitive path',
    (role) => {
      const input = buildReviewBriefInput();
      input.group.units = [{ ...input.group.units[0]!, path: 'src/auth.ts' }];
      input.files = [{ ...input.files[0]!, path: 'src/auth.ts', role }];
      expect(
        assessReviewGroupRisk({ ...input, highRiskPaths: ['**'] }),
      ).toEqual([]);
    },
  );

  it('uses adapter-reported entry points instead of guessing from a basename', () => {
    const tree = buildFractalTree([
      {
        path: '/project',
        name: 'project',
        type: 'fractal',
        hasIntentMd: true,
        hasDetailMd: true,
      },
    ]);
    tree.nodes.get('/project')!.entryPoints = [
      {
        path: '/project/public.ts',
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ];
    const options = {
      tree,
      projectRoot: '/project',
      generatedPaths: [],
      classifyVerification: () => 'unsupported' as const,
    };
    const input = buildReviewBriefInput();
    const entry = { ...input.files[0]!, path: 'public.ts' };
    const classified = classifyChangedFile(entry, options);
    expect(classified).toMatchObject({ publicEntryPoint: true });
    input.group.units = [{ ...input.group.units[0]!, path: entry.path }];
    input.files = [classified];
    expect(assessReviewGroupRisk({ ...input, highRiskPaths: [] })).toEqual([
      'public-boundary: public.ts',
    ]);
    expect(
      classifyChangedFile({ ...entry, path: 'index.ts' }, options)
        .publicEntryPoint,
    ).not.toBe(true);
  });

  it('uses only assigned boundary evidence and configured matching paths', () => {
    const input = buildReviewBriefInput();
    input.candidates = [
      {
        ...input.candidates[0]!,
        severity: 'error',
        rule: 'external-import-boundary',
      },
      {
        ...input.candidates[0]!,
        id: 'FCA-999',
        severity: 'error',
        rule: 'circular-dependency',
      },
    ];
    expect(
      assessReviewGroupRisk({ ...input, highRiskPaths: ['src/a.*'] }),
    ).toEqual([
      'configured-path: src/a.ts',
      'boundary-evidence: external-import-boundary (src/a.ts)',
    ]);
    input.group.candidateIds = [];
    expect(
      assessReviewGroupRisk({ ...input, highRiskPaths: ['payments/**'] }),
    ).toEqual([]);
  });

  it('does not turn churn, several owners, or an unrelated sensitive file into risk', () => {
    const input = buildReviewBriefInput();
    input.group.churn = 1024;
    input.files = input.files.map((file, index) => ({
      ...file,
      owner: `module-${index}`,
    }));
    input.files = [...input.files, { ...input.files[0]!, path: 'src/auth.ts' }];
    expect(assessReviewGroupRisk({ ...input, highRiskPaths: [] })).toEqual([]);
    input.group.rounds = 0;
    expect(assessReviewGroupRisk({ ...input, highRiskPaths: ['**'] })).toEqual(
      [],
    );
  });

  it('bounds repeated reasons and renders the evidence in the brief', () => {
    const input = buildReviewBriefInput();
    input.group.units = Array.from({ length: 32 }, (_, index) => ({
      ...input.group.units[0]!,
      path: `src/auth/mutex-${index}.ts`,
    }));
    input.files = input.group.units.map((unit) => ({
      ...input.files[0]!,
      path: unit.path,
      publicEntryPoint: true,
    }));
    input.candidates = [
      {
        ...input.candidates[0]!,
        path: input.files[0]!.path,
        severity: 'error',
        rule: 'external-import-boundary',
      },
    ];
    input.group.riskReasons = assessReviewGroupRisk({
      ...input,
      highRiskPaths: ['src/**'],
    });
    expect(input.group.riskReasons).toHaveLength(5);
    const brief = renderReviewBrief(input);
    expect(brief).toContain('risk_reasons:');
    expect(brief).toContain('security-path: src/auth/mutex-0.ts');
    expect(brief).not.toContain('security-path: src/auth/mutex-1.ts');
  });

  it.each([{ highRiskPaths: [] }, { highRiskPaths: ['src/payments/**'] }])(
    'accepts additional high-risk paths $highRiskPaths',
    ({ highRiskPaths }) => {
      const parsed = FilidConfigSchema.parse({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review: { highRiskPaths },
      });
      expect(parsed.review?.highRiskPaths).toEqual(highRiskPaths);
    },
  );
});
