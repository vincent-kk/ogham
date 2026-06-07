import { chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Make the built CLI entry executable for local `node`/`npx` runs.
// npm rewrites bin permissions on install, so this is a best-effort dev convenience.
const here = dirname(fileURLToPath(import.meta.url));
const binPath = join(here, '..', 'dist', 'index.js');

try {
  chmodSync(binPath, 0o755);
} catch (error) {
  process.stderr.write(
    `finalize-bin: could not chmod ${binPath}: ${String(error)}\n`,
  );
}
