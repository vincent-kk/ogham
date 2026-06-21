#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../../shared/index.js';
import { orchestrateUserPromptSubmit } from '../orchestrators/userPromptSubmit.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = await orchestrateUserPromptSubmit(input);
} catch (e) {
  logHookFailure('maencof', 'user-prompt-submit', e);
  result = { continue: true };
}

writeResult(result);
