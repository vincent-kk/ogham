#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { ActivityRecorderInput } from './activityRecorder.js';
import { runActivityRecorder } from './activityRecorder.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as ActivityRecorderInput;
  result = runActivityRecorder(input);
} catch (e) {
  logHookFailure('maencof', 'activity-recorder', e);
  result = { continue: true };
}

writeResult(result);
