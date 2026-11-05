import { describe, expect, it } from 'vitest';

import { validateDetailMd } from '../validators/validateDetailMd.js';
import { validateIntentMd } from '../validators/validateIntentMd.js';

/** Contract fixture with no redundant acceptance groups. */
const DETAIL =
  '# Contract\n## Requirements\nA reason.\n## API Contracts\nA policy.\n## Acceptance Criteria\nTests pin every criterion.\n## Last Updated\nWhen the policy changes.\n';

/** Boundary fixture below the line cap. */
const INTENT =
  '# Boundary\n## Always do\nKeep the boundary.\n## Ask first\nChange it.\n## Never do\nCross it.\n';

describe('document history errors', () => {
  it.each([validateIntentMd, validateDetailMd])(
    'rejects a level-two History section',
    (validate) => {
      expect(
        validate(DETAIL + '## History\nA decision.\n').violations,
      ).toContainEqual(
        expect.objectContaining({
          rule: 'history-section',
          section: 'History',
          severity: 'error',
        }),
      );
    },
  );

  it.each([
    '2026-1-2',
    '2026.01.02',
    '2026/01/02',
    'Changed on 1234-12-31.',
    '',
  ])('rejects an empty or dated trigger: %s', (body) => {
    const result = validateDetailMd(
      DETAIL.replace('When the policy changes.', body),
    );
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        rule: 'last-updated-trigger',
        section: 'Last Updated',
        severity: 'error',
      }),
    );
  });

  it.each(['```md\n## History\n```', '~~~md\n## History\n~~~'])(
    'ignores fenced History headings',
    (example) => {
      expect(validateIntentMd(INTENT + example).valid).toBe(true);
      expect(validateDetailMd(DETAIL + example).valid).toBe(true);
    },
  );

  it.each(['````md\n```\n## History\n````', '~~~md\n```\n## History\n~~~'])(
    'keeps History inside a fence until a matching close',
    (example) => {
      expect(validateIntentMd(INTENT + example).valid).toBe(true);
    },
  );

  it('does not classify another heading level or title as History', () => {
    expect(
      validateIntentMd(INTENT + '### History\n## History policy\n').valid,
    ).toBe(true);
  });

  it('allows a trigger-only contract without acceptance groups', () => {
    expect(validateDetailMd(DETAIL)).toMatchObject({
      valid: true,
      violations: [],
      acceptanceGroups: [],
    });
  });
});
