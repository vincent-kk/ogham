#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../../shared/index.js';
import { orchestratePreToolUse } from '../orchestrators/preToolUse.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = orchestratePreToolUse(input);
} catch (e) {
  logHookFailure('maencof', 'pre-tool-use', e);
  result = { continue: true };
}

writeResult(result);
