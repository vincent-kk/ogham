#!/usr/bin/env node
import { readStdin, writeResult } from '../shared.js';
import type { VaultRedirectorInput } from '../vault-redirector.js';
import { runVaultRedirector } from '../vault-redirector.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as VaultRedirectorInput;
  result = runVaultRedirector(input);
} catch {
  result = { continue: true };
}

writeResult(result);
