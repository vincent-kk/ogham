/**
 * @file vault-scanner.test.ts
 * @description VaultScanner 단위 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildSnapshot,
  computeChangeSet,
  type ScannedFile,
  type FileSnapshot,
} from '../../../core/vault-scanner.js';

// ScannedFile 헬퍼
function makeFile(relativePath: string, mtime: number): ScannedFile {
  return {
    absolutePath: `/vault/${relativePath}`,
    relativePath,
    mtime,
  };
}

describe('buildSnapshot', () => {
  it('ScannedFile 목록으로부터 스냅샷 맵을 생성한다', () => {
    const files: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 2000),
    ];

    const snapshot = buildSnapshot(files);

    expect(snapshot.size).toBe(2);
    expect(snapshot.get('01_Core/identity.md')).toBe(1000);
    expect(snapshot.get('02_Derived/notes.md')).toBe(2000);
  });

  it('빈 파일 목록은 빈 스냅샷을 반환한다', () => {
    const snapshot = buildSnapshot([]);
    expect(snapshot.size).toBe(0);
  });
});

describe('computeChangeSet', () => {
  let previous: FileSnapshot;

  beforeEach(() => {
    previous = new Map([
      ['01_Core/identity.md', 1000],
      ['02_Derived/notes.md', 2000],
      ['03_External/ref.md', 3000],
    ]);
  });

  it('새 파일을 added로 분류한다', () => {
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 2000),
      makeFile('03_External/ref.md', 3000),
      makeFile('04_Action/todo.md', 4000), // 신규
    ];

    const changeSet = computeChangeSet(previous, current);

    expect(changeSet.added).toHaveLength(1);
    expect(changeSet.added[0].relativePath).toBe('04_Action/todo.md');
    expect(changeSet.modified).toHaveLength(0);
    expect(changeSet.deleted).toHaveLength(0);
    expect(changeSet.unchanged).toHaveLength(3);
  });

  it('mtime이 변경된 파일을 modified로 분류한다', () => {
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 9999), // mtime 변경
      makeFile('03_External/ref.md', 3000),
    ];

    const changeSet = computeChangeSet(previous, current);

    expect(changeSet.modified).toHaveLength(1);
    expect(changeSet.modified[0].relativePath).toBe('02_Derived/notes.md');
    expect(changeSet.modified[0].mtime).toBe(9999);
    expect(changeSet.added).toHaveLength(0);
    expect(changeSet.deleted).toHaveLength(0);
    expect(changeSet.unchanged).toHaveLength(2);
  });

  it('현재 목록에 없는 파일을 deleted로 분류한다', () => {
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 2000),
      // 03_External/ref.md 삭제됨
    ];

    const changeSet = computeChangeSet(previous, current);

    expect(changeSet.deleted).toHaveLength(1);
    expect(changeSet.deleted[0]).toBe('03_External/ref.md');
    expect(changeSet.added).toHaveLength(0);
    expect(changeSet.modified).toHaveLength(0);
    expect(changeSet.unchanged).toHaveLength(2);
  });

  it('변경 없는 파일을 unchanged로 분류한다', () => {
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 2000),
      makeFile('03_External/ref.md', 3000),
    ];

    const changeSet = computeChangeSet(previous, current);

    expect(changeSet.unchanged).toHaveLength(3);
    expect(changeSet.added).toHaveLength(0);
    expect(changeSet.modified).toHaveLength(0);
    expect(changeSet.deleted).toHaveLength(0);
  });

  it('빈 이전 스냅샷은 모든 현재 파일을 added로 분류한다', () => {
    const emptyPrev: FileSnapshot = new Map();
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),
      makeFile('02_Derived/notes.md', 2000),
    ];

    const changeSet = computeChangeSet(emptyPrev, current);

    expect(changeSet.added).toHaveLength(2);
    expect(changeSet.modified).toHaveLength(0);
    expect(changeSet.deleted).toHaveLength(0);
    expect(changeSet.unchanged).toHaveLength(0);
  });

  it('빈 현재 목록은 모든 이전 파일을 deleted로 분류한다', () => {
    const changeSet = computeChangeSet(previous, []);

    expect(changeSet.deleted).toHaveLength(3);
    expect(changeSet.added).toHaveLength(0);
    expect(changeSet.modified).toHaveLength(0);
    expect(changeSet.unchanged).toHaveLength(0);
  });

  it('복합 변경 시나리오를 올바르게 처리한다', () => {
    const current: ScannedFile[] = [
      makeFile('01_Core/identity.md', 1000),       // unchanged
      makeFile('02_Derived/notes.md', 9999),        // modified
      // 03_External/ref.md 삭제
      makeFile('04_Action/todo.md', 4000),          // added
    ];

    const changeSet = computeChangeSet(previous, current);

    expect(changeSet.unchanged).toHaveLength(1);
    expect(changeSet.modified).toHaveLength(1);
    expect(changeSet.deleted).toHaveLength(1);
    expect(changeSet.added).toHaveLength(1);
  });
});
