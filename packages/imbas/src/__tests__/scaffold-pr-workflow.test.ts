/**
 * @file scaffold-pr-workflow.test.ts
 * @description G3 guardrail — verify the scaffold-pr Step 0 local-provider gate
 *   is structurally in place in both SKILL.md and references/workflow.md.
 *   This ensures the BLOCKED-before-read-issue invariant survives future edits.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCAFFOLD_PR_DIR = join(__dirname, '..', '..', 'skills', 'scaffold-pr');

function read(rel: string): string {
  return readFileSync(join(SCAFFOLD_PR_DIR, rel), 'utf-8');
}

describe('scaffold-pr — Step 0 local-provider gate', () => {
  it('SKILL.md workflow declares Step 0 before Step 1', () => {
    const content = read('SKILL.md');
    const workflowIdx = content.indexOf('## Workflow');
    expect(workflowIdx).toBeGreaterThan(-1);
    const section = content.slice(workflowIdx);
    const step0Idx = section.search(/^0\.\s/m);
    const step1Idx = section.search(/^1\.\s/m);
    expect(step0Idx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(step0Idx);
  });

  it('SKILL.md Step 0 contains the BLOCKED terminal marker for local provider', () => {
    expect(read('SKILL.md')).toMatch(
      /scaffold-pr BLOCKED:\s*local provider not supported/,
    );
  });

  it('SKILL.md Step 0 explicitly says "Do NOT continue" after BLOCK', () => {
    expect(read('SKILL.md')).toMatch(/Do NOT continue/);
  });

  it('references/workflow.md Step 0 heading appears before Step 1 heading', () => {
    const content = read('references/workflow.md');
    const step0Idx = content.indexOf('## Step 0');
    const step1Idx = content.indexOf('## Step 1');
    expect(step0Idx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(step0Idx);
  });

  it('references/workflow.md Step 0 BLOCKED marker matches SKILL.md', () => {
    expect(read('references/workflow.md')).toMatch(
      /scaffold-pr BLOCKED:\s*local provider not supported/,
    );
  });
});
