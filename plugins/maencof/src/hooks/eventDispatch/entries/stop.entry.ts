#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../../shared/index.js';
import { orchestrateStop } from '../orchestrators/stop.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = await orchestrateStop(input);
} catch (e) {
  logHookFailure('maencof', 'stop', e);
  result = { continue: true };
}

// Stop hook: exit 2 to block session exit; reason (and any lifecycle
// systemMessage) goes to stderr so neither signal is lost on a block.
if (!result.continue) {
  const blockMessage = [result.reason, result.systemMessage]
    .filter(Boolean)
    .join('\n\n');
  if (blockMessage) process.stderr.write(blockMessage);
  process.exit(2);
}

writeResult(result);
