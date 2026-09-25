import { createHash } from 'node:crypto';

/**
 * Hash-only provenance: raw host IDs and commands never enter actor metadata.
 * @param value Raw value to hash, e.g. a native session ID or a command string.
 * @returns The SHA-256 digest of `value`, hex-encoded.
 */
export function workflowHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
