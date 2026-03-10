#!/usr/bin/env node
import type { SessionEndInput } from '../../types/hooks.js';
import { readStdin } from '../../lib/stdin.js';
import { cleanupSession } from '../session-cleanup.js';

const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as SessionEndInput;
  result = cleanupSession(input);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
