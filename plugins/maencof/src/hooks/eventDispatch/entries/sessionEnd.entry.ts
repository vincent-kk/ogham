#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../../shared/index.js';
import { orchestrateSessionEnd } from '../orchestrators/sessionEnd.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = await orchestrateSessionEnd(input);
} catch (e) {
  logHookFailure('maencof', 'session-end', e);
  result = { continue: true };
}

writeResult(result);
