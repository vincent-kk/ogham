#!/usr/bin/env node
import { readStdin } from '../../lib/stdin.js';
import type { SessionStartInput } from '../../types/hooks.js';
import { processSetup } from '../setup.js';

const raw = await readStdin(5000);
let result;
try {
  const input = JSON.parse(raw) as SessionStartInput;
  result = processSetup(input);
} catch {
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));
