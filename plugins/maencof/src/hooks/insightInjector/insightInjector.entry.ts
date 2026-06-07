#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { readStdin, writeResult } from '../shared/index.js';

import type { InsightInjectorInput } from './insightInjector.js';
import { runInsightInjector } from './insightInjector.js';

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
