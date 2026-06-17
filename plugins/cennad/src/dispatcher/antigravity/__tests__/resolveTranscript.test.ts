import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AGY_HOME,
  AGY_LAST_CONVERSATIONS_PATH,
  agyTranscriptPath,
} from '../../../constants/paths.js';
import { resolveTranscript } from '../utils/resolveTranscript.js';

const CWD = '/tmp/antigravity-cwd/session-1';
const CONV = 'conv-1';

function doneEntry(content: string): string {
  return JSON.stringify({
    source: 'MODEL',
    type: 'PLANNER_RESPONSE',
    status: 'DONE',
    content,
  });
}

async function seedMap(map: Record<string, string>): Promise<void> {
  await mkdir(dirname(AGY_LAST_CONVERSATIONS_PATH), { recursive: true });
  await writeFile(AGY_LAST_CONVERSATIONS_PATH, JSON.stringify(map));
}

async function seedTranscript(convId: string, body: string): Promise<void> {
  const file = agyTranscriptPath(convId);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body);
}

describe('resolveTranscript', () => {
  beforeEach(async () => {
    await rm(AGY_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(AGY_HOME, { recursive: true, force: true });
  });

  it('recovers the DONE planner response for a matching cwd', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(CONV, doneEntry('recovered answer'));
    expect(await resolveTranscript(CWD, 0)).toBe('recovered answer');
  });

  it('returns null when no conversation maps to the cwd', async () => {
    await seedMap({ '/some/other/cwd': CONV });
    await seedTranscript(CONV, doneEntry('x'));
    expect(await resolveTranscript(CWD, 0)).toBeNull();
  });

  it('returns null when the conversation map is absent', async () => {
    expect(await resolveTranscript(CWD, 0)).toBeNull();
  });

  it('returns the last DONE entry when several are present', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(
      CONV,
      [doneEntry('first'), doneEntry('last')].join('\n'),
    );
    expect(await resolveTranscript(CWD, 0)).toBe('last');
  });

  it('tolerates CRLF endings and malformed lines', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(CONV, `not-json\r\n${doneEntry('clean')}\r\n`);
    expect(await resolveTranscript(CWD, 0)).toBe('clean');
  });

  it('ignores non-DONE and non-MODEL entries', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(
      CONV,
      [
        JSON.stringify({
          source: 'USER',
          type: 'USER_INPUT',
          status: 'DONE',
          content: 'prompt',
        }),
        JSON.stringify({
          source: 'MODEL',
          type: 'PLANNER_RESPONSE',
          status: 'STREAMING',
          content: 'partial',
        }),
      ].join('\n'),
    );
    expect(await resolveTranscript(CWD, 0)).toBeNull();
  });

  it('rejects a transcript older than `since`', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(CONV, doneEntry('stale'));
    expect(await resolveTranscript(CWD, Date.now() + 60_000)).toBeNull();
  });

  it('returns null when the DONE entry content is empty', async () => {
    await seedMap({ [CWD]: CONV });
    await seedTranscript(CONV, doneEntry(''));
    expect(await resolveTranscript(CWD, 0)).toBeNull();
  });
});
