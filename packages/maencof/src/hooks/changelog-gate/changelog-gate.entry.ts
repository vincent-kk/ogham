#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import type { ChangelogGateInput } from './changelog-gate.js';
import { runChangelogGate } from './changelog-gate.js';
import { readStdin, writeResult } from '../shared/index.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as ChangelogGateInput;
  result = await runChangelogGate(input);
} catch (e) {
  logHookFailure('maencof', 'changelog-gate', e);
  result = { continue: true };
}

// Stop hook: exit 2 to block session exit
if (!result.continue) {
  if (result.reason) {
    process.stderr.write(result.reason);
  }
  process.exit(2);
}

writeResult(result);
