// filid:contract AC-snapshot-hash
import { describe, expect, it, vi } from 'vitest';

import { computeSnapshotHash } from '../index.js';
import { normalizeSnapshotHashInput } from '../snapshotHash/normalizeSnapshotHashInput.js';

vi.mock('@ogham/cross-platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ogham/cross-platform')>()),
  readFileIfExistsSync: vi.fn(() => Buffer.from('same-content')),
}));

describe('snapshot hash portable path identity', () => {
  it('deduplicates Windows case and separator aliases', () => {
    const root = String.raw`C:\Project`;
    const canonical = String.raw`C:\Project\Module\value.ts`;
    const alias = 'c:/project/module/value.ts';

    expect(computeSnapshotHash(root, [canonical, alias])).toBe(
      computeSnapshotHash(root, [canonical]),
    );
  });

  it('normalizes Windows roots inside supplemental evidence', () => {
    const firstRoot = String.raw`C:\First`;
    const secondRoot = String.raw`D:\Second`;
    const firstFile = String.raw`C:\First\Module\value.ts`;
    const secondFile = String.raw`D:\Second\Module\value.ts`;
    const firstEvidence = {
      ownerPath: firstRoot,
      sourcePath: firstFile,
      message: `Inspection failed at ${firstFile}.`,
    };
    const secondEvidence = {
      ownerPath: secondRoot,
      sourcePath: secondFile,
      message: `Inspection failed at ${secondFile}.`,
    };

    expect(normalizeSnapshotHashInput(firstRoot, firstEvidence)).toEqual(
      normalizeSnapshotHashInput(secondRoot, secondEvidence),
    );
    expect(computeSnapshotHash(firstRoot, [firstFile], [firstEvidence])).toBe(
      computeSnapshotHash(secondRoot, [secondFile], [secondEvidence]),
    );
  });
});
