import { describe, expect, it } from 'vitest';

import { SHIPPED_SKILLS } from '../constants/budgets.js';
import { WORKFLOW_CHAIN_LINE } from '../constants/postureLines.js';
import {
  DOCUMENT_WRITING_SKILLS,
  VISIBLE_USER_STARTED_SKILLS,
  WORKFLOW_INVOCABLE_SKILLS,
} from '../constants/skillPolicy.js';

describe('architect skill policy', () => {
  // filid:contract AC-architecture-records
  it('keeps architect user-started and outside the workflow chain', () => {
    expect(SHIPPED_SKILLS).toContain('architect');
    expect(VISIBLE_USER_STARTED_SKILLS).toContain('architect');
    expect(DOCUMENT_WRITING_SKILLS).toContain('architect');
    expect(WORKFLOW_INVOCABLE_SKILLS).not.toContain('architect');
    expect(WORKFLOW_CHAIN_LINE).not.toContain('architect');
  });
});
