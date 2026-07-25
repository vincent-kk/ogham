/**
 * @file findNestedModuleTest.test.ts
 * @description Strategy 3(nested module)에서 모듈·조상 `__tests__` 탐색,
 * fractal 경계, 빈 테스트 파일 거부를 실제 tmpdir 픽스처로 검증한다.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableDirname, portableJoin } from '@ogham/cross-platform/paths';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findNestedModuleTest } from '../../../core/coverageVerify/testCoverageChecker/strategies/findNestedModuleTest.js';

const TEST_BODY = 'it("works", () => {});';

function file(path: string, content: string): void {
  mkdirSync(portableDirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

describe('findNestedModuleTest', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = portableJoin(
      tmpdir(),
      `filid-nested-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('finds an exact module-name test in the module test directory', () => {
    const src = portableJoin(tmp, 'src');
    const source = portableJoin(src, 'hooks', 'postToolUse', 'postToolUse.ts');
    const test = portableJoin(
      src,
      'hooks',
      'postToolUse',
      '__tests__',
      'postToolUse.test.ts',
    );
    file(source, 'export {};');
    file(test, TEST_BODY);

    expect(findNestedModuleTest(source)?.testFilePath).toBe(test);
  });

  it('accepts a behavior-named test in the module test directory', () => {
    const src = portableJoin(tmp, 'src');
    const source = portableJoin(src, 'hooks', 'postToolUse', 'postToolUse.ts');
    const test = portableJoin(
      src,
      'hooks',
      'postToolUse',
      '__tests__',
      'failureChain.test.ts',
    );
    file(source, 'export {};');
    file(test, TEST_BODY);

    expect(findNestedModuleTest(source)?.testFilePath).toBe(test);
  });

  it('finds a behavior-named test in an ancestor test directory', () => {
    const src = portableJoin(tmp, 'src');
    const source = portableJoin(src, 'hooks', 'shared', 'renderStatusLines.ts');
    const test = portableJoin(
      src,
      'hooks',
      '__tests__',
      'renderStatusLines.test.ts',
    );
    file(portableJoin(src, 'hooks', 'INTENT.md'), '# hooks');
    file(source, 'export {};');
    file(test, TEST_BODY);

    expect(findNestedModuleTest(source)?.testFilePath).toBe(test);
  });

  it('does not walk above the nearest fractal boundary', () => {
    const src = portableJoin(tmp, 'src');
    const source = portableJoin(src, 'hooks', 'shared', 'renderStatusLines.ts');
    file(portableJoin(src, 'hooks', 'INTENT.md'), '# hooks');
    file(source, 'export {};');
    file(
      portableJoin(src, '__tests__', 'renderStatusLines.test.ts'),
      TEST_BODY,
    );

    expect(findNestedModuleTest(source)).toBeNull();
  });

  it('rejects a behavior-named file with zero test cases', () => {
    const src = portableJoin(tmp, 'src');
    const source = portableJoin(src, 'hooks', 'postToolUse', 'postToolUse.ts');
    file(source, 'export {};');
    file(
      portableJoin(
        src,
        'hooks',
        'postToolUse',
        '__tests__',
        'failureChain.test.ts',
      ),
      '// no test cases',
    );

    expect(findNestedModuleTest(source)).toBeNull();
  });
});
