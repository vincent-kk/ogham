#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import type { InsightInjectorInput } from './insight-injector.js';
import { runInsightInjector } from './insight-injector.js';
import { readStdin, writeResult } from '../shared/index.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as InsightInjectorInput;
  result = runInsightInjector(input);
} catch (e) {
  logHookFailure('maencof', 'insight-injector', e);
  result = { continue: true };
}

writeResult(result);
