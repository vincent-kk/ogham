import type { SetupFormData, ServiceCredentials } from '../../../../../types/index.js';
import { MASK } from '../constants/mask.js';

/** Restore masked credential values submitted by the setup UI back to the
 *  underlying secrets from existing storage. The api_token MASK can map back
 *  to either the basic.api_token or bearer.token slot — the routing decision
 *  is re-made by buildCredentials based on the current username. */
export function restoreMaskedValues(
  svc: NonNullable<SetupFormData['jira']>,
  existing: ServiceCredentials | undefined,
): void {
  if (!existing) return;
  if (svc.api_token === MASK) {
    svc.api_token = existing.basic?.api_token ?? existing.bearer?.token;
  }
  if (svc.password === MASK) svc.password = existing.basic?.password;
}
