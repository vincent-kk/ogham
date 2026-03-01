#!/usr/bin/env node
import type { SessionEndInput } from '../session-end.js';
import { runSessionEnd } from '../session-end.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as SessionEndInput;
  result = runSessionEnd(input);
} catch {
  result = { continue: true };
}

writeResult(result);
