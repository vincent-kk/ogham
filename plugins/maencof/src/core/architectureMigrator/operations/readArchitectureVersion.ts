/**
 * @file readArchitectureVersion.ts
 * @description .maencof-meta/version.json 에서 아키텍처 버전을 읽는다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { VaultVersionInfo } from '../../../types/setup.js';

export function readArchitectureVersion(vaultPath: string): string {
  const versionPath = join(vaultPath, '.maencof-meta', 'version.json');
  if (!existsSync(versionPath)) return '1.0.0';
  try {
    const data = JSON.parse(
      readFileSync(versionPath, 'utf-8'),
    ) as VaultVersionInfo;
    return data.architecture_version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}
