import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildChain, findBoundary } from '../../../core/boundary-detector.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'boundary-detector-test-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('findBoundary', () => {
  it('단일 프로젝트: package.json 위치 반환', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'src', 'module'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'module', 'file.ts'), '');

    const result = findBoundary(join(tmp, 'src', 'module', 'file.ts'));
    expect(result).toBe(resolve(tmp));
  });

  it('모노레포: 가장 가까운 package.json (패키지 루트) 반환', () => {
    mkdirSync(join(tmp, 'packages', 'pkg', 'src'), { recursive: true });
    writeFileSync(join(tmp, 'packages', 'pkg', 'package.json'), '{}');
    writeFileSync(join(tmp, 'packages', 'pkg', 'src', 'file.ts'), '');

    const result = findBoundary(join(tmp, 'packages', 'pkg', 'src', 'file.ts'));
    expect(result).toBe(resolve(join(tmp, 'packages', 'pkg')));
  });

  it('파일이 프로젝트 루트에 있을 때', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    writeFileSync(join(tmp, 'file.ts'), '');

    const result = findBoundary(join(tmp, 'file.ts'));
    expect(result).toBe(resolve(tmp));
  });

  it('package.json이 없으면 null 반환', () => {
    mkdirSync(join(tmp, 'deep', 'nested'), { recursive: true });
    writeFileSync(join(tmp, 'deep', 'nested', 'file.ts'), '');

    // tmp 하위에 package.json 없음 (tmp 자체에도 없음)
    const result = findBoundary(join(tmp, 'deep', 'nested', 'file.ts'));
    // tmp 조상 중 실제 package.json이 있을 수 있으므로,
    // 결과가 null이거나 tmp 밖의 경로여야 함
    if (result !== null) {
      expect(result.startsWith(tmp)).toBe(false);
    } else {
      expect(result).toBeNull();
    }
  });
});

describe('buildChain', () => {
  it('체인 순서: leaf → boundary (루트 방향)', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'src', 'module'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'module', 'file.ts'), '');

    const result = buildChain(join(tmp, 'src', 'module', 'file.ts'));
    expect(result).not.toBeNull();

    const chain = result!.chain;
    expect(chain[0]).toBe(resolve(join(tmp, 'src', 'module')));
    expect(chain[1]).toBe(resolve(join(tmp, 'src')));
    expect(chain[2]).toBe(resolve(tmp));
    expect(result!.boundary).toBe(resolve(tmp));
  });

  it('INTENT.md 감지', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'src'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'INTENT.md'), '# intent');
    writeFileSync(join(tmp, 'src', 'file.ts'), '');

    const result = buildChain(join(tmp, 'src', 'file.ts'));
    expect(result).not.toBeNull();

    const srcDir = resolve(join(tmp, 'src'));
    expect(result!.intents.get(srcDir)).toBe(true);
    expect(result!.intents.get(resolve(tmp))).toBe(false);
  });

  it('DETAIL.md 감지', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'src'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'DETAIL.md'), '# detail');
    writeFileSync(join(tmp, 'src', 'file.ts'), '');

    const result = buildChain(join(tmp, 'src', 'file.ts'));
    expect(result).not.toBeNull();

    const srcDir = resolve(join(tmp, 'src'));
    expect(result!.details.get(srcDir)).toBe(true);
    expect(result!.details.get(resolve(tmp))).toBe(false);
  });

  it('혼합 체인: INTENT.md 있는 디렉토리만 true', () => {
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'src', 'module'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'INTENT.md'), '# src intent');
    // tmp/src/module 에는 INTENT.md 없음
    writeFileSync(join(tmp, 'src', 'module', 'file.ts'), '');

    const result = buildChain(join(tmp, 'src', 'module', 'file.ts'));
    expect(result).not.toBeNull();

    const moduleDir = resolve(join(tmp, 'src', 'module'));
    const srcDir = resolve(join(tmp, 'src'));
    const rootDir = resolve(tmp);

    expect(result!.intents.get(moduleDir)).toBe(false);
    expect(result!.intents.get(srcDir)).toBe(true);
    expect(result!.intents.get(rootDir)).toBe(false);
  });

  it('boundary 없으면 null 반환', () => {
    mkdirSync(join(tmp, 'deep'), { recursive: true });
    writeFileSync(join(tmp, 'deep', 'file.ts'), '');

    // tmp에 package.json이 없는 경우 null이거나 tmp 외부 경로
    const result = buildChain(join(tmp, 'deep', 'file.ts'));
    if (result !== null) {
      // boundary가 tmp 밖에 있어야 함 (실제 시스템 package.json)
      expect(result.boundary.startsWith(tmp)).toBe(false);
    } else {
      expect(result).toBeNull();
    }
  });
});
