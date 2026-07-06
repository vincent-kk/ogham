/**
 * @file readCompanionIdentity.ts
 * @description .maencof-meta/companion-identity.json을 읽어 정본 최소 형태로 정규화.
 *
 * 파일이 레거시(v1)여도 normalizeCompanionIdentity가 정규화해 반환한다(마이그레이션 이전 graceful).
 * 실패/유효성 미통과 시 null.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CompanionIdentityMinimal } from '../../types/companionGuard.js';
import { normalizeCompanionIdentity } from '../companionNormalize/index.js';

/**
 * companion-identity.json을 읽고 정본 최소 형태로 정규화한다. 실패 시 null.
 */
export function readCompanionIdentity(
  cwd: string,
): CompanionIdentityMinimal | null {
  const identityPath = join(cwd, '.maencof-meta', 'companion-identity.json');
  try {
    if (!existsSync(identityPath)) return null;
    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    return normalizeCompanionIdentity(raw);
  } catch {
    return null;
  }
}
