import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InstructionsLoadedInput } from '../../../types/hooks.js';
import { processInstructionsLoaded } from '../instructionsLoaded.js';
import { observationLogPath } from '../utils/appendObservation.js';

/** Project fixture isolated from the host's configuration. */
let cwd: string;

beforeEach(() => {
  cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-instruction-log-'));
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'standard' });
  rmSync(observationLogPath(), { force: true });
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(cwd, { recursive: true, force: true });
  rmSync(observationLogPath(), { force: true });
});

it('stores only allowed metadata and its own observation time', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  const metadata: InstructionsLoadedInput = {
    cwd,
    session_id: 'session-a',
    hook_event_name: 'InstructionsLoaded',
    transcript_path: '/metadata/transcript.jsonl',
    turn_id: 'turn-a',
    prompt_id: 'prompt-a',
    tool_use_id: 'invocation-a',
    agent_id: 'agent-a',
    model: 'test-model',
    permission_mode: 'default',
    reason: 'include',
    file_path: '/metadata/CLAUDE.md',
    memory_type: 'Project',
    load_reason: 'include',
    globs: ['src/**/*.ts'],
    trigger_file_path: '/metadata/src/example.ts',
    parent_file_path: '/metadata/parent/CLAUDE.md',
  };

  expect(
    processInstructionsLoaded({
      ...metadata,
      observedAt: 'host-supplied-time',
      content: 'rule-body-sentinel',
      source_code: 'user-code-sentinel',
      unknown_metadata: { nested: 'nested-body-sentinel' },
    }),
  ).toEqual({ continue: true });

  const record = JSON.parse(readFileSync(observationLogPath(), 'utf8'));
  expect(record).toEqual({
    ...metadata,
    observedAt: '2026-01-01T00:00:00.000Z',
  });
});

it('omits absent optional metadata from the record', () => {
  processInstructionsLoaded({
    cwd,
    session_id: 'session-a',
    hook_event_name: 'InstructionsLoaded',
  });

  expect(JSON.parse(readFileSync(observationLogPath(), 'utf8'))).toEqual({
    cwd,
    session_id: 'session-a',
    hook_event_name: 'InstructionsLoaded',
    observedAt: expect.any(String),
  });
});

it('keeps observation disabled when the dial is off', () => {
  writeConfig(cwd, 'project', { intervention: 'off' });

  expect(
    processInstructionsLoaded({
      cwd,
      session_id: 'session-a',
      hook_event_name: 'InstructionsLoaded',
      content: 'rule-body-sentinel',
    }),
  ).toEqual({ continue: true });
  expect(existsSync(observationLogPath())).toBe(false);
});
