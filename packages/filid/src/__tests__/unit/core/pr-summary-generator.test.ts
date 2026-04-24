import { describe, expect, it } from 'vitest';

import { generateHumanSummary } from '../../../core/pr-summary/index.js';

// --- Test fixtures ---

const STRUCTURE_CHECK_ALL_PASS = `---
scope: diff
stage_results:
  structure: PASS
  documents: PASS
  tests: PASS
  metrics: PASS
  dependencies: PASS
overall: PASS
critical_count: 0
created_at: 2026-03-17T00:00:00Z
---

## Structure Check — Stage Results
`;

const STRUCTURE_CHECK_WITH_FAILURES = `---
scope: diff
stage_results:
  structure: FAIL
  documents: PASS
  tests: FAIL
  metrics: SKIP
  dependencies: PASS
overall: FAIL
critical_count: 2
created_at: 2026-03-17T00:00:00Z
---

## Structure Check — Stage Results
`;

const FIX_REQUESTS_SINGLE = `# Fix Requests — feature/test

**Generated**: 2026-03-17T00:00:00Z
**Total Items**: 1 (structure: 1, code quality: 0)

---

## FIX-001: Remove circular dependency

- **Severity**: CRITICAL
- **Source**: structure
- **Path**: \`src/core/module-a.ts\`
- **Rule**: circular-dependency
- **Current**: module-a → module-b → module-a
- **Raised by**: Phase A
- **Recommended Action**: Break the cycle by extracting shared logic
`;

const FIX_REQUESTS_MULTI = `# Fix Requests — feature/test

**Generated**: 2026-03-17T00:00:00Z
**Total Items**: 7 (structure: 4, code quality: 3)

---

## FIX-001: Circular dependency detected

- **Severity**: CRITICAL
- **Source**: structure
- **Path**: \`src/core/a.ts\`
- **Rule**: circular-dependency
- **Recommended Action**: Break cycle in a.ts

## FIX-002: Missing entry point

- **Severity**: HIGH
- **Source**: structure
- **Path**: \`src/features/auth\`
- **Rule**: module-entry-point
- **Recommended Action**: Add index.ts to auth module

## FIX-003: Naming violation

- **Severity**: LOW
- **Source**: structure
- **Path**: \`src/utils/MyHelper.ts\`
- **Rule**: naming-convention
- **Recommended Action**: Rename to camelCase

## FIX-004: Max depth exceeded

- **Severity**: HIGH
- **Source**: structure
- **Path**: \`src/a/b/c/d/e/f\`
- **Rule**: max-depth
- **Recommended Action**: Flatten the nesting

## FIX-005: Barrel pattern violation

- **Severity**: MEDIUM
- **Source**: structure
- **Path**: \`src/features/index.ts\`
- **Rule**: index-barrel-pattern
- **Recommended Action**: Make index.ts a pure re-export barrel

## FIX-006: Code quality issue

- **Severity**: MEDIUM
- **Source**: code-quality
- **Path**: \`src/lib/parser.ts\`
- **Recommended Action**: Reduce function complexity

## FIX-007: Zero peer file violation

- **Severity**: HIGH
- **Source**: structure
- **Path**: \`src/features/auth/config.yml\`
- **Rule**: zero-peer-file
- **Recommended Action**: Move config.yml out of fractal root
`;

const REVIEW_REPORT_APPROVED = `## Review Report

**Verdict**: APPROVED

All checks passed.
`;

const REVIEW_REPORT_CHANGES = `## Review Report

**Verdict**: REQUEST_CHANGES

Found 3 issues.
`;

const REVIEW_REPORT_INCONCLUSIVE = `## Review Report

**Verdict**: INCONCLUSIVE

Unable to determine.
`;

const REVALIDATE_FAIL = `## Re-validation — FAIL

Issues remain.
`;

// --- Tests ---

describe('generateHumanSummary', () => {
  // Basic tests

  it('generates summary with all files present and findings', () => {
    const result = generateHumanSummary({
      structureCheckContent: STRUCTURE_CHECK_WITH_FAILURES,
      fixRequestsContent: FIX_REQUESTS_SINGLE,
      reviewReportContent: REVIEW_REPORT_CHANGES,
      revalidateContent: null,
      branch: 'feature/test',
    });

    expect(result.branch).toBe('feature/test');
    expect(result.verdict).toBe('REQUEST_CHANGES');
    expect(result.totalFindings).toBeGreaterThan(0);
    expect(result.reviewItems.length).toBeGreaterThan(0);
    expect(result.reviewItems.length).toBeLessThanOrEqual(5);
    expect(result.markdown).toContain('# PR Human Summary');
  });

  it('generates clean summary when all checks pass', () => {
    const result = generateHumanSummary({
      structureCheckContent: STRUCTURE_CHECK_ALL_PASS,
      fixRequestsContent: null,
      reviewReportContent: REVIEW_REPORT_APPROVED,
      revalidateContent: null,
      branch: 'main',
    });

    expect(result.verdict).toBe('APPROVED');
    expect(result.totalFindings).toBe(0);
    expect(result.reviewItems).toHaveLength(1);
    expect(result.reviewItems[0].severity).toBe('pass');
    expect(result.reviewItems[0].message).toBe('모든 검증 통과');
  });

  it('handles single fix-request item', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: FIX_REQUESTS_SINGLE,
      reviewReportContent: REVIEW_REPORT_CHANGES,
      revalidateContent: null,
      branch: 'fix/bug',
    });

    expect(result.reviewItems).toHaveLength(1);
    expect(result.reviewItems[0].ruleId).toBe('circular-dependency');
    expect(result.reviewItems[0].errorProbability).toBe(0.95);
  });

  // Edge case tests

  it('graceful degradation: all files missing', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: null,
      reviewReportContent: null,
      revalidateContent: null,
      branch: 'orphan',
    });

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.totalFindings).toBe(0);
    expect(result.markdown).toContain('# PR Human Summary');
  });

  it('handles empty fix-requests content', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: '# Fix Requests\n\nNo items.',
      reviewReportContent: REVIEW_REPORT_APPROVED,
      revalidateContent: null,
      branch: 'clean',
    });

    expect(result.totalFindings).toBe(0);
    expect(result.verdict).toBe('APPROVED');
  });

  it('limits reviewItems to top 5 when >5 findings', () => {
    const result = generateHumanSummary({
      structureCheckContent: STRUCTURE_CHECK_WITH_FAILURES,
      fixRequestsContent: FIX_REQUESTS_MULTI,
      reviewReportContent: REVIEW_REPORT_CHANGES,
      revalidateContent: null,
      branch: 'many-issues',
    });

    // autoFixable items (naming-convention, module-entry-point, index-barrel-pattern)
    // are separated into autoFixItems
    expect(result.reviewItems.length).toBeLessThanOrEqual(5);
    expect(result.autoFixItems.length).toBeGreaterThan(0);
  });

  it('separates all autoFixable items correctly', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: FIX_REQUESTS_MULTI,
      reviewReportContent: REVIEW_REPORT_CHANGES,
      revalidateContent: null,
      branch: 'auto-fix',
    });

    const autoFixRules = result.autoFixItems.map((i) => i.ruleId);
    for (const rule of autoFixRules) {
      expect([
        'naming-convention',
        'index-barrel-pattern',
        'module-entry-point',
      ]).toContain(rule);
    }
    for (const item of result.reviewItems) {
      if (item.ruleId) {
        expect([
          'naming-convention',
          'index-barrel-pattern',
          'module-entry-point',
        ]).not.toContain(item.ruleId);
      }
    }
  });

  it('handles malformed YAML frontmatter', () => {
    const result = generateHumanSummary({
      structureCheckContent: 'not yaml at all',
      fixRequestsContent: null,
      reviewReportContent: REVIEW_REPORT_APPROVED,
      revalidateContent: null,
      branch: 'malformed',
    });

    // Should not crash, graceful degradation
    expect(result.verdict).toBe('APPROVED');
    expect(result.totalFindings).toBe(0);
  });

  it('re-validate verdict overrides review-report verdict', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: null,
      reviewReportContent: REVIEW_REPORT_APPROVED,
      revalidateContent: REVALIDATE_FAIL,
      branch: 'override',
    });

    expect(result.verdict).toBe('FAIL');
  });

  it('uses severity fallback when ruleId is unknown', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: FIX_REQUESTS_MULTI,
      reviewReportContent: null,
      revalidateContent: null,
      branch: 'fallback',
    });

    // FIX-006 has no rule, severity MEDIUM → fallback 0.50
    const noRuleItem = result.reviewItems.find(
      (i) => !i.ruleId && i.errorProbability === 0.5,
    );
    expect(noRuleItem).toBeDefined();
  });

  it('ignores SKIP stages in structure check', () => {
    const result = generateHumanSummary({
      structureCheckContent: STRUCTURE_CHECK_WITH_FAILURES,
      fixRequestsContent: null,
      reviewReportContent: null,
      revalidateContent: null,
      branch: 'skip-test',
    });

    // Only FAIL stages (structure, tests) should appear, not SKIP (metrics)
    const messages = result.reviewItems.map((i) => i.message);
    expect(messages.some((m) => m.includes('structure'))).toBe(true);
    expect(messages.some((m) => m.includes('tests'))).toBe(true);
    expect(messages.some((m) => m.includes('metrics'))).toBe(false);
  });

  it('handles INCONCLUSIVE verdict', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: null,
      reviewReportContent: REVIEW_REPORT_INCONCLUSIVE,
      revalidateContent: null,
      branch: 'inconclusive',
    });

    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('sorts reviewItems by errorProbability descending', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: FIX_REQUESTS_MULTI,
      reviewReportContent: null,
      revalidateContent: null,
      branch: 'sorted',
    });

    for (let i = 1; i < result.reviewItems.length; i++) {
      expect(result.reviewItems[i - 1].errorProbability).toBeGreaterThanOrEqual(
        result.reviewItems[i].errorProbability,
      );
    }
  });

  it('renders markdown with correct emoji indicators', () => {
    const result = generateHumanSummary({
      structureCheckContent: null,
      fixRequestsContent: FIX_REQUESTS_SINGLE,
      reviewReportContent: REVIEW_REPORT_CHANGES,
      revalidateContent: null,
      branch: 'emoji',
    });

    // CRITICAL → 🚨
    expect(result.markdown).toContain('🚨');
    expect(result.markdown).toContain('## 이 PR에서 확인해야 할 것:');
    expect(result.markdown).toContain('Verdict: **REQUEST_CHANGES**');
  });
});
