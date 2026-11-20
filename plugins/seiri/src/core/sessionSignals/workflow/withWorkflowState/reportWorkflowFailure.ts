import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import { logHookFailure, writeFileAtomicallySync } from '@ogham/cross-platform';

/**
 * Report an actor transaction failure and quarantine a failed boundary.
 * @param path Existing actor state path, used to locate its isolation markers.
 * @param revokeOnFailure Whether a boundary must leave the actor quarantined.
 * @param suspend Whether recovery must also suspend the existing binding.
 * @returns Nothing. Storage failures while marking isolation are reported separately.
 */
export function reportWorkflowFailure(
  path: string,
  revokeOnFailure: boolean,
  suspend: boolean | undefined,
): void {
  logHookFailure(
    'seiri',
    'workflow-state',
    'Actor transaction skipped: lock or storage unavailable.',
  );
  if (!revokeOnFailure || !existsSync(path)) return;
  try {
    writeFileAtomicallySync(`${path}.revoked`, randomUUID());
    if (suspend)
      writeFileAtomicallySync(`${path}.revoked-suspend`, randomUUID());
  } catch {
    logHookFailure(
      'seiri',
      'workflow-state',
      'Revocation could not be persisted; reset participation after storage recovers.',
    );
  }
}
