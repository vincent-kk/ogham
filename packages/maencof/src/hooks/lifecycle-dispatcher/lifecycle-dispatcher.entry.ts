#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { LifecycleDispatcherInput } from './lifecycle-dispatcher.js';
import { runLifecycleDispatcher } from './lifecycle-dispatcher.js';

// Event name is passed as CLI argument: lifecycle-dispatcher.mjs <EventName>
const event = process.argv[2] ?? '';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as LifecycleDispatcherInput;
  result = runLifecycleDispatcher(event, input);
} catch (e) {
  logHookFailure('maencof', `lifecycle-dispatcher:${event}`, e);
  result = { continue: true };
}

writeResult(result);
