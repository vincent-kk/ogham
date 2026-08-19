/**
 * @file layerDirPath.test.ts
 * @description isLayerDirPath — 레이어 디렉토리 첫 세그먼트 게이트.
 * traversal(`..`)·절대경로·대소문자 불일치가 게이트를 우회하지 못해야 한다 (R2).
 */
import { describe, expect, it } from 'vitest';

import { isLayerDirPath } from '../../types/layer.js';

describe('isLayerDirPath', () => {
  it.each([
    ['01_Core/identity.md', true],
    ['04_Action/2026/02/log.md', true],
    ['./01_Core/identity.md', true],
    ['01_Core\\win\\doc.md', true],
    ['99_Archive/stored.md', false],
    ['notes-root.md', false],
    ['07_Unknown/mystery.md', false],
    ['01_Core/../99_Archive/escape.md', false],
    ['../outside.md', false],
    ['/abs/01_Core/doc.md', false],
    ['01_core/doc.md', false],
  ] as const)('%s → %s', (path, expected) => {
    expect(isLayerDirPath(path)).toBe(expected);
  });
});
