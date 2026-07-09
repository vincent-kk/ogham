/**
 * @file claudeMdMerger.ts
 * @description CLAUDE.md 머지 클래스 (설정 보관) — mergeMaencofSection/read/remove 래퍼.
 */
import type { MergeResult } from '../types/types.js';

import { mergeMaencofSection } from './mergeMaencofSection.js';
import { readMaencofSection } from './readMaencofSection.js';
import { removeMaencofSection } from './removeMaencofSection.js';

export class ClaudeMdMerger {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** maencof 섹션 삽입/업데이트 */
  merge(maencofContent: string, options?: { dryRun?: boolean }): MergeResult {
    return mergeMaencofSection(this.filePath, maencofContent, options);
  }

  /** maencof 섹션 읽기 */
  read(): string | null {
    return readMaencofSection(this.filePath);
  }

  /** maencof 섹션 제거 */
  remove(options?: { dryRun?: boolean }): boolean {
    return removeMaencofSection(this.filePath, options);
  }

  /** maencof 섹션 존재 여부 */
  hasSection(): boolean {
    return this.read() !== null;
  }
}
