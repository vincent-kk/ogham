#!/usr/bin/env node
import type { PreToolUseInput } from '../layer-guard.js';
import { runLayerGuard } from '../layer-guard.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = runLayerGuard(input);
} catch {
  result = { continue: true };
}

writeResult(result);
