#!/usr/bin/env node
import type { SessionStartInput } from '../session-start.js';
import { runSessionStart } from '../session-start.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as SessionStartInput;
  result = runSessionStart(input);
} catch {
  result = { continue: true };
}

writeResult(result);
