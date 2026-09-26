/** Loaded by this fractal's index for build:setup; the bundle location determines the sibling MCP server. */
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { runSetupVault } from '../src/cli/setupVault/index.js';

/** Parse literal CLI arguments and translate connection outcomes to process status. */
export async function runSetupVaultCommand() {
  const { values } = parseArgs({
    options: {
      host: { type: 'string' },
      'vault-root': { type: 'string' },
      apply: { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
  });
  if (
    (values.host !== 'claude' && values.host !== 'codex') ||
    !values['vault-root']
  )
    throw new Error(
      'Usage: setup-vault --host <claude|codex> --vault-root <absolute-path> [--apply]',
    );

  const result = await runSetupVault({
    host: values.host,
    vaultRoot: values['vault-root'],
    bundlePath: fileURLToPath(import.meta.url),
    apply: values.apply,
  });
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
