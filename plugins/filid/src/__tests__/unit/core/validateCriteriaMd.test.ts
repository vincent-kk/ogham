import { describe, expect, it } from 'vitest';

import { validateCriteriaMd } from '../../../core/rules/documentValidator/documentValidator.js';

function claim(
  id: string,
  fields: Partial<Record<string, string>> = {},
): string {
  const merged = {
    status: 'active',
    scope: 'src/hooks/preToolUse',
    claim: 'Spike-branch writes to INTENT.md over 50 lines are not denied',
    observable:
      'preToolValidator unit test "spikeExempt allows INTENT.md Write over 50 lines"',
    expected: 'hook returns continue:true without permissionDecision deny',
    ...fields,
  };
  return [
    `## ${id}: sample claim`,
    ...Object.entries(merged)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `- ${key}: ${value}`),
  ].join('\n');
}

const HEADER = '# Acceptance Criteria Ledger\n';

describe('validateCriteriaMd', () => {
  it('passes a well-formed ledger with multiple claims', () => {
    const content = [HEADER, claim('CLM-001'), claim('CLM-002')].join('\n');
    const result = validateCriteriaMd(content);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('passes a header-only ledger (initial creation, zero claims)', () => {
    expect(validateCriteriaMd(HEADER).valid).toBe(true);
  });

  it('fails when a required field is missing or empty', () => {
    const content = [HEADER, claim('CLM-001', { observable: undefined })].join(
      '\n',
    );
    const result = validateCriteriaMd(content);
    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'missing-field', severity: 'error' }),
    );
    expect(result.violations[0].message).toContain('observable');
  });

  it('fails on a status outside active|superseded|retired', () => {
    const content = [HEADER, claim('CLM-001', { status: 'done' })].join('\n');
    const result = validateCriteriaMd(content);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'invalid-status', severity: 'error' }),
    );
  });

  it('fails on duplicate claim ids', () => {
    const content = [HEADER, claim('CLM-001'), claim('CLM-001')].join('\n');
    const result = validateCriteriaMd(content);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'duplicate-id', severity: 'error' }),
    );
  });

  it('fails when a claim present in oldContent is deleted', () => {
    const oldContent = [HEADER, claim('CLM-001'), claim('CLM-002')].join('\n');
    const newContent = [HEADER, claim('CLM-002')].join('\n');
    const result = validateCriteriaMd(newContent, oldContent);
    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'claim-removed', severity: 'error' }),
    );
  });

  it('allows status transitions and new appends against oldContent', () => {
    const oldContent = [HEADER, claim('CLM-001')].join('\n');
    const newContent = [
      HEADER,
      claim('CLM-001', { status: 'retired' }),
      claim('CLM-002'),
    ].join('\n');
    expect(validateCriteriaMd(newContent, oldContent).valid).toBe(true);
  });

  it('rejects tautological claims (claim == expected)', () => {
    const content = [
      HEADER,
      claim('CLM-001', {
        claim: 'The module works as the module works',
        expected: 'the module works as the module works',
      }),
    ].join('\n');
    const result = validateCriteriaMd(content);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'tautology', severity: 'error' }),
    );
  });

  it('parses heading variants (###, bold) so claims cannot hide from the lint', () => {
    const boldHeading = claim('CLM-001', { observable: undefined }).replace(
      '## CLM-001',
      '### **CLM-001**',
    );
    const result = validateCriteriaMd([HEADER, boldHeading].join('\n'));
    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'missing-field', severity: 'error' }),
    );

    const oldLedger = [HEADER, claim('CLM-001')].join('\n');
    const removalViaVariant = validateCriteriaMd(HEADER, oldLedger);
    expect(removalViaVariant.violations).toContainEqual(
      expect.objectContaining({ rule: 'claim-removed' }),
    );
  });

  it('rejects degenerate observable == expected duplication', () => {
    const content = [
      HEADER,
      claim('CLM-001', {
        observable: 'banner is injected',
        expected: 'Banner is injected.',
      }),
    ].join('\n');
    const result = validateCriteriaMd(content);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: 'tautology', severity: 'error' }),
    );
  });
});
