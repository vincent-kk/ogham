/**
 * @file skill-portfolio.test.ts
 * @description Regression guard for the maencof skill portfolio. Asserts:
 *   1. The `skills/` directory contains exactly EXPECTED_COUNT `maencof-*` directories.
 *   2. No skill or agent markdown file references a slash invocation of a REMOVED_SKILLS entry.
 *
 * Update EXPECTED_COUNT and REMOVED_SKILLS as skills are merged or removed.
 * Source of truth: .omc/plans/maencof-skill-portfolio-refactor.md.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fg from 'fast-glob';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/__tests__/integration → packages/maencof
const PACKAGE_ROOT = join(__dirname, '..', '..', '..');
const SKILLS_DIR = join(PACKAGE_ROOT, 'skills');

const REMOVED_SKILLS = ['maencof-rebuild'];
const EXPECTED_COUNT = 28;

describe('maencof skill portfolio invariants', () => {
  it(`skills/ contains exactly ${EXPECTED_COUNT} maencof-* directories`, () => {
    const dirs = readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && entry.name.startsWith('maencof-'),
    );
    expect(dirs.length).toBe(EXPECTED_COUNT);
  });

  it('no skill or agent markdown references removed slash invocations', async () => {
    const files = await fg(['skills/**/*.md', 'agents/**/*.md'], {
      cwd: PACKAGE_ROOT,
      absolute: true,
    });

    const matches: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      for (const removed of REMOVED_SKILLS) {
        if (content.includes(`/maencof:${removed}`)) {
          matches.push(`${file}: contains /maencof:${removed}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });
});
