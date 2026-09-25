import { createHash } from 'node:crypto';

/** Hash-only provenance: raw host IDs and commands never enter actor metadata. */
export function workflowHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
