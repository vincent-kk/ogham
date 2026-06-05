#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { SessionEndInput } from './sessionEnd.js';
import { runSessionEnd } from './sessionEnd.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as SessionEndInput;
  result = runSessionEnd(input);
} catch (e) {
  logHookFailure('maencof', 'session-end', e);
  result = { continue: true };
}

writeResult(result);
