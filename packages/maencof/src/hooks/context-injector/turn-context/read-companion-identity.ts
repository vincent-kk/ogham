/**
 * @file read-companion-identity.ts
 * @description Read and validate .maencof-meta/companion-identity.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CompanionIdentityMinimal } from '../../../types/companion-guard.js';
import { isValidCompanionIdentity } from '../../../types/companion-guard.js';

/**
 * companion-identity.json을 읽고 검증한다. 실패/유효성 미통과 시 null 반환.
 */
export function readCompanionIdentity(
  cwd: string,
): CompanionIdentityMinimal | null {
  const identityPath = join(cwd, '.maencof-meta', 'companion-identity.json');
  try {
    if (!existsSync(identityPath)) return null;
    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    return isValidCompanionIdentity(raw) ? raw : null;
  } catch {
    return null;
  }
}
