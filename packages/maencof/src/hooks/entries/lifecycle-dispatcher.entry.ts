#!/usr/bin/env node
import type { LifecycleDispatcherInput } from '../lifecycle-dispatcher.js';
import { runLifecycleDispatcher } from '../lifecycle-dispatcher.js';
import { readStdin, writeResult } from '../shared.js';

// Event name is passed as CLI argument: lifecycle-dispatcher.mjs <EventName>
const event = process.argv[2] ?? '';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as LifecycleDispatcherInput;
  result = runLifecycleDispatcher(event, input);
} catch {
  result = { continue: true };
}

writeResult(result);
