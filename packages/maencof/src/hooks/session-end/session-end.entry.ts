#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import type { SessionEndInput } from './session-end.js';
import { runSessionEnd } from './session-end.js';
import { readStdin, writeResult } from '../shared/index.js';

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
