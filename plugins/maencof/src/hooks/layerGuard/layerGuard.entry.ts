#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { PreToolUseInput } from './layerGuard.js';
import { runLayerGuard } from './layerGuard.js';

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
