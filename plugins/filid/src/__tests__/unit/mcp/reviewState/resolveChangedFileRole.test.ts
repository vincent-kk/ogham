import { describe, expect, it, vi } from 'vitest';

import { REVIEW_LOCKFILE_BASENAMES } from '../../../../constants/reviewState.js';
import { isLockfilePath } from '../../../../mcp/tools/reviewState/select/isLockfilePath.js';
import { resolveChangedFileRole } from '../../../../mcp/tools/reviewState/select/resolveChangedFileRole.js';
import type { ReviewChangedFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Build one changed-file fact without hiding role-selection inputs.
 *
 * @param path Project-relative changed path.
 * @param change Normalized Git change class.
 * @param binary Whether Git represented the path as binary.
 * @returns Complete changed-file fact for role selection.
 */
function changedFile(
  path: string,
  change: ReviewChangedFile['change'] = 'M',
  binary = false,
): ReviewChangedFile {
  return { path, change, insertions: 1, deletions: 1, binary };
}

describe('resolveChangedFileRole — first matching role wins', () => {
  it.each([
    {
      name: 'generated before deleted, binary, lockfile, document, and verification',
      entry: changedFile('generated/README.md', 'D', true),
      generatedPaths: ['generated'],
      lockfiles: ['README.md'],
      classified: 'test-record',
      expected: 'generated',
      verificationCalls: 0,
    },
    {
      name: 'deleted before binary, lockfile, and verification',
      entry: changedFile('src/yarn.lock', 'D', true),
      generatedPaths: [],
      lockfiles: ['yarn.lock'],
      classified: 'test-record',
      expected: 'source',
      verificationCalls: 0,
    },
    {
      name: 'binary before lockfile, document, and verification',
      entry: changedFile('src/README.md', 'M', true),
      generatedPaths: [],
      lockfiles: ['README.md'],
      classified: 'test-record',
      expected: 'binary',
      verificationCalls: 0,
    },
    {
      name: 'lockfile before document and verification',
      entry: changedFile('src/README.md'),
      generatedPaths: [],
      lockfiles: ['README.md'],
      classified: 'test-record',
      expected: 'lockfile',
      verificationCalls: 0,
    },
    {
      name: 'document before verification',
      entry: changedFile('src/README.md'),
      generatedPaths: [],
      lockfiles: [],
      classified: 'test-record',
      expected: 'document',
      verificationCalls: 0,
    },
    {
      name: 'verification when the adapter classifies it',
      entry: changedFile('src/value.test.ts'),
      generatedPaths: [],
      lockfiles: [],
      classified: 'test-record',
      expected: 'verification',
      verificationCalls: 1,
    },
    {
      name: 'source when no earlier rule matches',
      entry: changedFile('src/value.ts'),
      generatedPaths: [],
      lockfiles: [],
      classified: 'unsupported',
      expected: 'source',
      verificationCalls: 1,
    },
  ] as const)(
    '$name',
    ({
      entry,
      generatedPaths,
      lockfiles,
      classified,
      expected,
      verificationCalls,
    }) => {
      /** Adapter spy proves earlier precedence branches do not read a file. */
      const classifyVerification = vi.fn(() => classified);

      expect(
        resolveChangedFileRole(entry, `/project/${entry.path}`, {
          generatedPaths,
          lockfiles,
          classifyVerification,
        }),
      ).toBe(expected);
      expect(classifyVerification).toHaveBeenCalledTimes(verificationCalls);
    },
  );
});

describe('isLockfilePath — configured basename matching', () => {
  it('matches a canonical lockfile at any depth', () => {
    expect(
      isLockfilePath('packages/app/yarn.lock', REVIEW_LOCKFILE_BASENAMES),
    ).toBe(true);
  });

  it('matches a configured custom basename', () => {
    expect(isLockfilePath('nested/custom.lock', ['custom.lock'])).toBe(true);
  });

  it('does not treat a basename prefix as a lockfile', () => {
    expect(isLockfilePath('packages/app/yarn.lock.backup', ['yarn.lock'])).toBe(
      false,
    );
  });
});
