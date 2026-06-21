#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin } from '../shared/readStdin.js';
import { writeResult } from '../shared/writeResult.js';
import type {
  DispatchInput,
  MergedHookOutput,
} from '../../types/dispatch.js';

import { orchestrateStop } from './stop.js';

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
