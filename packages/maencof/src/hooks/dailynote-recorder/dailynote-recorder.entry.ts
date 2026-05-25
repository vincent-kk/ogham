#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { DailynoteRecorderInput } from './dailynote-recorder.js';
import { runDailynoteRecorder } from './dailynote-recorder.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as DailynoteRecorderInput;
  result = runDailynoteRecorder(input);
} catch (e) {
  logHookFailure('maencof', 'dailynote-recorder', e);
  result = { continue: true };
}

writeResult(result);
