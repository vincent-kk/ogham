/**
 * @file updateVersionFile.ts
 * @description version.json 의 architecture_version 필드를 갱신한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import type { VaultVersionInfo } from '../../../types/setup.js';

export function updateVersionFile(filePath: string, newVersion: string): void {
  let data: VaultVersionInfo;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8')) as VaultVersionInfo;
  } catch {
    data = {
      version: '0.0.0',
      installedAt: new Date().toISOString(),
      migrationHistory: [],
    };
  }
  data.architecture_version = newVersion;
  writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}
