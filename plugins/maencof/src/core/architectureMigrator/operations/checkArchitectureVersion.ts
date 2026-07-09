/**
 * @file checkArchitectureVersion.ts
 * @description 현재 vault의 아키텍처 버전을 확인한다.
 */
import { EXPECTED_ARCHITECTURE_VERSION } from '../../../constants/architecture.js';

import { readArchitectureVersion } from './readArchitectureVersion.js';

/**
 * 현재 vault의 아키텍처 버전을 확인한다.
 */
export function checkArchitectureVersion(vaultPath: string): {
  current: string;
  expected: string;
  needsMigration: boolean;
} {
  const current = readArchitectureVersion(vaultPath);
  return {
    current,
    expected: EXPECTED_ARCHITECTURE_VERSION,
    needsMigration: current !== EXPECTED_ARCHITECTURE_VERSION,
  };
}
