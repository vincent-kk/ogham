#!/usr/bin/env node
import { readStdin, writeResult } from '../shared.js';
import type {
  VaultCommitterEvent,
  VaultCommitterInput,
} from '../vault-committer.js';
import { runVaultCommitter } from '../vault-committer.js';

// Event name passed as CLI argument: vault-committer.mjs [SessionEnd|UserPromptSubmit]
const event = (process.argv[2] ?? 'SessionEnd') as VaultCommitterEvent;

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as VaultCommitterInput;
  result = runVaultCommitter(input, event);
} catch {
  result = { continue: true };
}

writeResult(result);
