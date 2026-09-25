/** Loaded by build:setup; this entry point starts the standalone CLI. */
import { runSetupVaultCommand } from './setupVault.entry.js';

runSetupVaultCommand().catch(() => {
  console.error(
    'Project vault connection failed. Check the host, absolute vault root, installed server, and configuration ownership.',
  );
  process.exitCode = 1;
});
