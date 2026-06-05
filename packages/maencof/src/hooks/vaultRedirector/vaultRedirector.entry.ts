#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { VaultRedirectorInput } from './vaultRedirector.js';
import { runVaultRedirector } from './vaultRedirector.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as VaultRedirectorInput;
  result = runVaultRedirector(input);
} catch (e) {
  logHookFailure('maencof', 'vault-redirector', e);
  result = { continue: true };
}

writeResult(result);
