#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { UserPromptSubmitInput } from './context-injector.js';
import { injectContext } from './context-injector.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = injectContext(input);
} catch (e) {
  logHookFailure('maencof', 'context-injector', e);
  result = { continue: true };
}
writeResult(result);
