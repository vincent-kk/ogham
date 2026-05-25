#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import type { PreToolUseInput } from './layer-guard.js';
import { runLayerGuard } from './layer-guard.js';
import { readStdin, writeResult } from '../shared/index.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = runLayerGuard(input);
} catch (e) {
  logHookFailure('maencof', 'layer-guard', e);
  result = { continue: true };
}

writeResult(result);
