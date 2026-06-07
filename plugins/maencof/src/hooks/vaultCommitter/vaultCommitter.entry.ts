#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type {
  VaultCommitterEvent,
  VaultCommitterInput,
} from './vaultCommitter.js';
import { runVaultCommitter } from './vaultCommitter.js';

// Event name passed as CLI argument: vault-committer.mjs [SessionEnd|UserPromptSubmit]
const event = (process.argv[2] ?? 'SessionEnd') as VaultCommitterEvent;

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as VaultCommitterInput;
  result = await runVaultCommitter(input, event);
} catch (e) {
  logHookFailure('maencof', 'vault-committer', e);
  result = { continue: true };
}

writeResult(result);
