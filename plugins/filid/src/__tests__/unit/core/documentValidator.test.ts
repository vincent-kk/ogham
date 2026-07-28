import { describe, expect, it } from 'vitest';

import {
  countLines,
  detectAppendOnly,
  parseBoundaryExemptions,
  validateDetailAcceptanceGroups,
  validateDetailMd,
  validateIntentMd,
} from '../../../core/rules/documentValidator/index.js';
import * as documentValidator from '../../../core/rules/documentValidator/index.js';

describe('document-validator', () => {
  it('does not expose a legacy criteria ledger validator', () => {
    expect('validateCriteriaMd' in documentValidator).toBe(false);
  });

  describe('countLines', () => {
    it('should count lines correctly', () => {
      expect(countLines('')).toBe(0);
      expect(countLines('one line')).toBe(1);
      expect(countLines('line1\nline2\nline3')).toBe(3);
    });

    it('should handle trailing newline', () => {
      expect(countLines('line1\nline2\n')).toBe(2);
    });
  });

  describe('validateIntentMd', () => {
    it('should pass for valid INTENT.md under 50 lines', () => {
      const content = [
        '# Module',
        '## Boundaries',
        '### Always do',
        '- Test',
        '### Ask first',
        '- Review',
        '### Never do',
        '- Skip tests',
      ].join('\n');
      const result = validateIntentMd(content);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass for exactly 50 lines', () => {
      const content = Array.from(
        { length: 50 },
        (_, i) => `Line ${i + 1}`,
      ).join('\n');
      const result = validateIntentMd(content);
      expect(result.valid).toBe(true);
    });

    it('should fail for INTENT.md exceeding 50 lines', () => {
      const content = Array.from(
        { length: 51 },
        (_, i) => `Line ${i + 1}`,
      ).join('\n');
      const result = validateIntentMd(content);
      expect(result.valid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'line-limit',
          severity: 'error',
        }),
      );
    });

    it('should warn when missing 3-tier boundaries', () => {
      const content = '# My Module\nSome description\n';
      const result = validateIntentMd(content);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'missing-boundaries',
          severity: 'warning',
        }),
      );
    });

    it('should pass for INTENT.md with English headings and non-English content', () => {
      const content = [
        '# 인증 모듈',
        '## Boundaries',
        '### Always do',
        '- 인증 토큰 검증',
        '### Ask first',
        '- 스키마 변경',
        '### Never do',
        '- 비밀번호 평문 저장',
      ].join('\n');
      const result = validateIntentMd(content);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass when all 3-tier boundaries are present', () => {
      const content = [
        '# My Module',
        '## Boundaries',
        '### Always do',
        '- Run tests',
        '### Ask first',
        '- Change schema',
        '### Never do',
        '- Commit secrets',
      ].join('\n');
      const result = validateIntentMd(content);
      const boundaryViolations = result.violations.filter(
        (v) => v.rule === 'missing-boundaries',
      );
      expect(boundaryViolations).toHaveLength(0);
    });
  });

  describe('validateDetailMd', () => {
    it('should pass for valid DETAIL.md', () => {
      const content = [
        '# Spec',
        '## Requirements',
        '- Feature A',
        '## API Contracts',
        '- `feature(): void`',
        '## Acceptance Criteria',
        '### AC-feature — Feature behavior',
        '- The feature is observable.',
        '## Last Updated',
        '2026-07-26',
      ].join('\n');
      const result = validateDetailMd(content);
      expect(result.valid).toBe(true);
    });

    it('should extract stable acceptance groups', () => {
      const content = [
        '# Spec',
        '## Requirements',
        '- Feature A',
        '## API Contracts',
        '- `feature(): void`',
        '## Acceptance Criteria',
        '### AC-feature — Feature behavior',
        '- The feature is observable.',
        '## Last Updated',
        '2026-07-26',
      ].join('\n');

      expect(validateDetailAcceptanceGroups(content)).toEqual({
        groups: [
          {
            id: 'AC-feature',
            title: 'Feature behavior',
            line: 7,
          },
        ],
        violations: [],
      });
    });

    it('should reject a DETAIL.md without required sections or groups', () => {
      const result = validateDetailMd('# Spec\n## Requirements\n- Feature A\n');

      expect(result.valid).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: 'missing-section' }),
        ]),
      );
    });

    it('should reject duplicate acceptance group IDs', () => {
      const content = [
        '# Spec',
        '## Requirements',
        '- Feature A',
        '## API Contracts',
        '- `feature(): void`',
        '## Acceptance Criteria',
        '### AC-feature — First behavior',
        '- The first behavior is observable.',
        '### AC-feature — Second behavior',
        '- The second behavior is observable.',
        '## Last Updated',
        '2026-07-26',
      ].join('\n');

      const result = validateDetailMd(content);

      expect(result.valid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'duplicate-id',
          severity: 'error',
        }),
      );
    });

    it('should fail when append-only pattern detected', () => {
      const oldContent = '# Spec\n## Log\n- Entry 1\n- Entry 2\n';
      const newContent =
        '# Spec\n## Log\n- Entry 1\n- Entry 2\n- Entry 3\n- Entry 4\n';
      const result = validateDetailMd(newContent, oldContent);
      expect(result.valid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'append-only',
          severity: 'error',
        }),
      );
    });

    it('should pass when content is restructured not just appended', () => {
      const oldContent = '# Spec\n## Old Section\n- Item 1\n';
      const newContent = '# Spec\n## Refactored Section\n- Consolidated item\n';
      const result = validateDetailMd(newContent, oldContent);
      const appendViolations = result.violations.filter(
        (v) => v.rule === 'append-only',
      );
      expect(appendViolations).toHaveLength(0);
    });
  });

  describe('detectAppendOnly', () => {
    it('should detect pure append (new lines added at end, nothing removed)', () => {
      const oldContent = 'line1\nline2\n';
      const newContent = 'line1\nline2\nline3\nline4\n';
      expect(detectAppendOnly(oldContent, newContent)).toBe(true);
    });

    it('should not flag when lines are modified', () => {
      const oldContent = 'line1\nline2\n';
      const newContent = 'line1-modified\nline2\nline3\n';
      expect(detectAppendOnly(oldContent, newContent)).toBe(false);
    });

    it('should not flag when lines are removed', () => {
      const oldContent = 'line1\nline2\nline3\n';
      const newContent = 'line1\nline3\nline4\n';
      expect(detectAppendOnly(oldContent, newContent)).toBe(false);
    });

    it('should not flag when old content is empty (initial creation)', () => {
      expect(detectAppendOnly('', 'new content')).toBe(false);
    });
  });

  describe('parseBoundaryExemptions', () => {
    const exemptionSection = (
      reason: string,
      directImport = 'allowed',
      consumers = '`**/src/hooks/**`',
    ) =>
      [
        '## Organ Exemptions',
        '',
        '### shared — hook bundle isolation',
        '',
        `- **Consumers**: ${consumers}`,
        `- **Direct import**: ${directImport}`,
        `- **Reason**: ${reason}`,
      ].join('\n');

    it('returns nothing when the conditional section is absent', () => {
      expect(parseBoundaryExemptions('## Requirements\n\n- none\n')).toEqual({
        exemptions: [],
        violations: [],
      });
    });

    it('parses organ path, consumers, direct import and reason', () => {
      const result = parseBoundaryExemptions(
        exemptionSection('The barrel drags every re-export into the bundle.'),
      );

      expect(result.violations).toEqual([]);
      expect(result.exemptions).toHaveLength(1);
      expect(result.exemptions[0]).toMatchObject({
        targetPath: 'shared',
        title: 'hook bundle isolation',
        consumers: ['**/src/hooks/**'],
        directImport: true,
        reason: 'The barrel drags every re-export into the bundle.',
      });
    });

    it('treats an empty reason as an unmet contract', () => {
      const result = parseBoundaryExemptions(exemptionSection('   '));

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: 'missing-field',
        severity: 'error',
      });
    });

    it('reads entry-point consumers and a withheld direct import', () => {
      const result = parseBoundaryExemptions(
        exemptionSection(
          'Stays put for LCA reasons.',
          'not allowed',
          'entry-point',
        ),
      );

      expect(result.exemptions[0]).toMatchObject({
        consumers: ['entry-point'],
        directImport: false,
      });
    });

    it('surfaces exemptions and their violations through validateDetailMd', () => {
      const content = [
        '## Requirements',
        '## API Contracts',
        '## Acceptance Criteria',
        '### AC-one — First',
        '## Last Updated',
        '2026-07-28',
        exemptionSection(''),
      ].join('\n');
      const result = validateDetailMd(content);

      expect(result.boundaryExemptions).toHaveLength(1);
      expect(result.valid).toBe(false);
    });
  });
});
