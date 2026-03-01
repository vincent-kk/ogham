#!/usr/bin/env node
import type { DailynoteRecorderInput } from '../dailynote-recorder.js';
import { runDailynoteRecorder } from '../dailynote-recorder.js';
import { readStdin, writeResult } from '../shared.js';

const raw = await readStdin();
let result;
try {
  const input = JSON.parse(raw) as DailynoteRecorderInput;
  result = runDailynoteRecorder(input);
} catch {
  result = { continue: true };
}

writeResult(result);
