/**
 * @file writeWAL.ts
 * @description WAL 을 상위 디렉토리 보장 후 파일에 기록한다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { MigrationWAL } from '../../../types/setup.js';

export function writeWAL(walPath: string, wal: MigrationWAL): void {
  mkdirSync(dirname(walPath), { recursive: true });
  writeFileSync(walPath, JSON.stringify(wal), 'utf-8');
}
