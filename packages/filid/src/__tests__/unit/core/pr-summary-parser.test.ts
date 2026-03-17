import { describe, expect, it } from 'vitest';

import {
  RULE_ERROR_PROBABILITY,
  parseFixRequests,
  parseStructureCheckFrontmatter,
} from '../../../core/pr-summary-generator.js';

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
- **Recommended Action**: Rename to kebab-case

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

// --- Tests ---

describe('parseStructureCheckFrontmatter', () => {
  it('parses valid frontmatter with all stages', () => {
    const result = parseStructureCheckFrontmatter(STRUCTURE_CHECK_ALL_PASS);
    expect(result).not.toBeNull();
    expect(result!.stageResults).toEqual({
      structure: 'PASS',
      documents: 'PASS',
      tests: 'PASS',
      metrics: 'PASS',
      dependencies: 'PASS',
    });
    expect(result!.overall).toBe('PASS');
    expect(result!.criticalCount).toBe(0);
  });

  it('parses frontmatter with FAIL and SKIP stages', () => {
    const result = parseStructureCheckFrontmatter(
      STRUCTURE_CHECK_WITH_FAILURES,
    );
    expect(result).not.toBeNull();
    expect(result!.stageResults.structure).toBe('FAIL');
    expect(result!.stageResults.metrics).toBe('SKIP');
    expect(result!.overall).toBe('FAIL');
    expect(result!.criticalCount).toBe(2);
  });

  it('returns null for content without frontmatter', () => {
    expect(parseStructureCheckFrontmatter('no frontmatter')).toBeNull();
  });
});

describe('parseFixRequests', () => {
  it('parses single fix request', () => {
    const items = parseFixRequests(FIX_REQUESTS_SINGLE);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('FIX-001');
    expect(items[0].severity).toBe('CRITICAL');
    expect(items[0].source).toBe('structure');
    expect(items[0].filePath).toBe('src/core/module-a.ts');
    expect(items[0].rule).toBe('circular-dependency');
    expect(items[0].recommendedAction).toBe(
      'Break the cycle by extracting shared logic',
    );
  });

  it('parses multiple fix requests', () => {
    const items = parseFixRequests(FIX_REQUESTS_MULTI);
    expect(items).toHaveLength(7);
    expect(items[0].rule).toBe('circular-dependency');
    expect(items[2].rule).toBe('naming-convention');
    expect(items[5].rule).toBe(''); // code-quality has no rule
  });

  it('returns empty array for content without fix blocks', () => {
    expect(parseFixRequests('no fix requests')).toHaveLength(0);
  });
});

describe('RULE_ERROR_PROBABILITY', () => {
  it('contains all 8 builtin rule IDs', () => {
    expect(Object.keys(RULE_ERROR_PROBABILITY)).toHaveLength(8);
    expect(RULE_ERROR_PROBABILITY['circular-dependency']).toBe(0.95);
    expect(RULE_ERROR_PROBABILITY['naming-convention']).toBe(0.2);
  });
});
