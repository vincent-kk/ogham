import { randomBytes } from 'node:crypto';
import { renameSync, writeFileSync } from 'node:fs';

/**
 * Write `content` to `destPath` through a tmp file + rename, so an
 * interrupted write can never leave a half-written file behind — a
 * truncated rule doc is worse than an absent one, and a truncated config
 * would strand the project on defaults with no way to tell why.
 *
 * The tmp name carries pid + randomness because hook processes write the
 * same destination concurrently; a shared staging path would let one
 * writer's rename strand another's.
 *
 * The parent directory must already exist; callers that create files in a
 * fresh tree create it first.
 */
export function writeAtomically(
  destPath: string,
  content: string | Uint8Array,
): void {
  const tmpPath = `${destPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, destPath);
}
