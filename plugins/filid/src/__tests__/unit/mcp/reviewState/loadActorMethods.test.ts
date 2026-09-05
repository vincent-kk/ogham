import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadActorMethods } from '../../../../mcp/tools/reviewState/rules/loadActorMethods.js';

import { writeReviewActorMethods } from './helpers/writeReviewActorMethods.js';

/** Temporary root whose actor methods are inspected without a rule map. */
let root: string;
beforeEach(() => {
  root = mkdtempSync(portableJoin(tmp(), 'actor-methods-'));
  writeReviewActorMethods(root);
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('loadActorMethods', () => {
  it('loads both canonical actor files verbatim from the cross-review skill root', () => {
    const result = loadActorMethods(root);
    expect(result.reviewer).toBe(
      readFileSync(
        portableJoin(root, 'skills/cross-review/reviewers/reviewer.md'),
        'utf8',
      ),
    );
    expect(result.verifier).toBe(
      readFileSync(
        portableJoin(root, 'skills/cross-review/reviewers/verifier.md'),
        'utf8',
      ),
    );
  });

  it('reports a stable code for an unavailable plugin root', () => {
    expect(() => loadActorMethods(null)).toThrow(
      expect.objectContaining({ code: 'review-actor-method-missing' }),
    );
  });

  it('reports a stable code for a missing method', () => {
    rmSync(portableJoin(root, 'skills/cross-review/reviewers/verifier.md'));
    expect(() => loadActorMethods(root)).toThrow(
      expect.objectContaining({ code: 'review-actor-method-missing' }),
    );
  });

  it('rejects a symlinked actor method', () => {
    const path = portableJoin(
      root,
      'skills/cross-review/reviewers/verifier.md',
    );
    rmSync(path);
    symlinkSync(
      portableJoin(root, 'skills/cross-review/reviewers/reviewer.md'),
      path,
    );
    expect(() => loadActorMethods(root)).toThrow(/symbolic link/i);
  });
});
