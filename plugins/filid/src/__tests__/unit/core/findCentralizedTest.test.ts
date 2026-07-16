/**
 * @file findCentralizedTest.test.ts
 * @description Strategy 3(centralized) 동작과, 전략 공통 `src` 앵커링 회귀
 * (mirror/integration 이 monorepo 에서 발화 불가하던 버그)를 실제 tmpdir
 * 픽스처로 검증한다. fs mock 없이 실 파일시스템을 사용한다.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findCentralizedTest } from '../../../core/coverageVerify/testCoverageChecker/strategies/findCentralizedTest.js';
import { findIntegrationTest } from '../../../core/coverageVerify/testCoverageChecker/strategies/findIntegrationTest.js';
import { findMirrorTest } from '../../../core/coverageVerify/testCoverageChecker/strategies/findMirrorTest.js';
import { nearestSrcRoot } from '../../../core/coverageVerify/testCoverageChecker/strategies/nearestSrcRoot.js';

const TEST_BODY = 'it("works", () => {});';

function file(path: string, content: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

describe('findCentralizedTest', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(
      tmpdir(),
      `filid-central-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('finds a flattened test by exact basename', () => {
    const src = join(tmp, 'src');
    file(
      join(src, 'core', 'tree', 'boundaryDetector', 'boundaryDetector.ts'),
      'export {};',
    );
    file(
      join(src, '__tests__', 'unit', 'core', 'boundaryDetector.test.ts'),
      TEST_BODY,
    );

    const found = findCentralizedTest(
      join(src, 'core', 'tree', 'boundaryDetector', 'boundaryDetector.ts'),
    );
    expect(found?.testFilePath).toBe(
      join(src, '__tests__', 'unit', 'core', 'boundaryDetector.test.ts'),
    );
  });

  it('falls back to the owning fractal name as a prefix', () => {
    const src = join(tmp, 'src');
    file(join(src, 'hooks', 'shared', 'INTENT.md'), '# shared');
    file(
      join(src, 'hooks', 'shared', 'utils', 'isFcaProject.ts'),
      'export {};',
    );
    file(join(src, '__tests__', 'unit', 'hooks', 'shared.test.ts'), TEST_BODY);

    const found = findCentralizedTest(
      join(src, 'hooks', 'shared', 'utils', 'isFcaProject.ts'),
    );
    expect(found?.testFilePath).toBe(
      join(src, '__tests__', 'unit', 'hooks', 'shared.test.ts'),
    );
  });

  it('returns null when neither basename nor fractal prefix matches', () => {
    const src = join(tmp, 'src');
    file(join(src, 'hooks', 'utils', 'organChecker.ts'), 'export {};');
    file(join(src, '__tests__', 'unit', 'hooks', 'other.test.ts'), TEST_BODY);

    expect(
      findCentralizedTest(join(src, 'hooks', 'utils', 'organChecker.ts')),
    ).toBeNull();
  });

  it('rejects matched files that contain zero test cases', () => {
    const src = join(tmp, 'src');
    file(join(src, 'core', 'service.ts'), 'export {};');
    file(
      join(src, '__tests__', 'unit', 'core', 'service.test.ts'),
      '// empty — no it()/test() at all',
    );

    expect(findCentralizedTest(join(src, 'core', 'service.ts'))).toBeNull();
  });

  it('returns null for files not under any src directory', () => {
    file(join(tmp, 'scripts', 'build.ts'), 'export {};');
    expect(nearestSrcRoot(join(tmp, 'scripts', 'build.ts'))).toBeNull();
    expect(findCentralizedTest(join(tmp, 'scripts', 'build.ts'))).toBeNull();
  });
});

describe('strategy anchoring in a monorepo (regression)', () => {
  // findMirrorTest/findIntegrationTest anchored on `projectRoot/src`, so with
  // projectRoot = repo root and sources under plugins/<pkg>/src/** they NEVER
  // fired — every monorepo usage site was reported hasTest:false.
  let tmp: string;

  beforeEach(() => {
    tmp = join(
      tmpdir(),
      `filid-anchor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('findMirrorTest anchors on the file own src root, not projectRoot/src', () => {
    const pkgSrc = join(tmp, 'plugins', 'pkg', 'src');
    file(join(pkgSrc, 'core', 'service.ts'), 'export {};');
    file(
      join(pkgSrc, '__tests__', 'unit', 'core', 'service.test.ts'),
      TEST_BODY,
    );

    const found = findMirrorTest(join(pkgSrc, 'core', 'service.ts'), tmp);
    expect(found?.testFilePath).toBe(
      join(pkgSrc, '__tests__', 'unit', 'core', 'service.test.ts'),
    );
  });

  it('findIntegrationTest anchors on the file own src root', () => {
    const pkgSrc = join(tmp, 'plugins', 'pkg', 'src');
    file(join(pkgSrc, 'core', 'service.ts'), 'export {};');
    file(
      join(pkgSrc, '__tests__', 'integration', 'service-e2e.test.ts'),
      TEST_BODY,
    );

    const found = findIntegrationTest(join(pkgSrc, 'core', 'service.ts'), tmp);
    expect(found?.testFilePath).toBe(
      join(pkgSrc, '__tests__', 'integration', 'service-e2e.test.ts'),
    );
  });
});
