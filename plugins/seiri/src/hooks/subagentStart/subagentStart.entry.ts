#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processSubagentStart } from './subagentStart.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as SubagentStartInput;
  result = processSubagentStart(input);
} catch (error) {
  // Never hold up a spawn on our own failure. Some subagent environments
  // do not close a hook's stdin, which is what the read timeout is for —
  // and if it still goes wrong, the subagent starts without our line.
  logHookFailure(PLUGIN_NAME, HookName.SUBAGENT_START, error);
}

process.stdout.write(JSON.stringify(result));
