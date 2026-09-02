#!/usr/bin/env node

import { runCommand } from './lib/run-command.mjs';

try {
  console.log(
    JSON.stringify(runCommand(import.meta.url, process.argv.slice(2))),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
