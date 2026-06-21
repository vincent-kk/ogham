#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin } from '../shared/readStdin.js';
import { writeResult } from '../shared/writeResult.js';
import type {
  DispatchInput,
  MergedHookOutput,
} from '../utils/dispatchTypes.js';

import { orchestratePostToolUse } from './postToolUse.js';

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = orchestratePostToolUse(input);
} catch (e) {
  logHookFailure('maencof', 'post-tool-use', e);
  result = { continue: true };
}

writeResult(result);
