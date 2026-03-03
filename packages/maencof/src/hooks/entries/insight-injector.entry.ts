#!/usr/bin/env node
import type { InsightInjectorInput } from '../insight-injector.js';
import { runInsightInjector } from '../insight-injector.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as InsightInjectorInput;
  result = runInsightInjector(input);
} catch {
  result = { continue: true };
}

writeResult(result);
