import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { projectMetaPath, sessionPath } from '../../constants/paths.js';
import { atomicWrite } from '../../lib/atomicWrite.js';
import { logger } from '../../lib/logger.js';
import {
  ProjectMetaSchema,
  type Provider,
  type SessionMeta,
  SessionMetaSchema,
} from '../../types/index.js';
import { isFileNotFound } from '../../utils/isFileNotFound.js';
import { isoNow } from '../../utils/isoNow.js';
import { getProjectHash } from '../projectHash/index.js';

export interface CreateSessionInput {
  sessionId?: string;
  provider: Provider;
  cwd: string;
  externalSessionRef: string;
  model: string;
  options?: Record<string, unknown>;
}

async function ensureProjectMeta(
  projectHash: string,
  cwd: string,
  now: string,
): Promise<void> {
  const metaPath = projectMetaPath(projectHash);
  try {
    const text = await readFile(metaPath, 'utf8');
    const parsed = ProjectMetaSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      if (parsed.data.cwd !== cwd) {
        logger.warn('project_hash collision', {
          project_hash: projectHash,
          existing_cwd: parsed.data.cwd,
          new_cwd: cwd,
        });
      }
      return;
    }
    logger.warn('_meta.json invalid, overwriting', {
      project_hash: projectHash,
    });
  } catch (err) {
    if (!isFileNotFound(err)) {
      logger.warn('_meta.json unreadable, overwriting', {
        error: (err as Error).message,
      });
    }
  }
  await atomicWrite(
    metaPath,
    `${JSON.stringify({ cwd, created_at: now }, null, 2)}\n`,
  );
}

export async function createSession(
  input: CreateSessionInput,
): Promise<SessionMeta> {
  const projectHash = getProjectHash(input.cwd);
  const sessionId = input.sessionId ?? randomUUID();
  const now = isoNow();
  const meta = SessionMetaSchema.parse({
    session_id: sessionId,
    provider: input.provider,
    created_at: now,
    last_used_at: now,
    turn_count: 1,
    external_session_ref: input.externalSessionRef,
    cwd: input.cwd,
    project_hash: projectHash,
    model: input.model,
    options: input.options ?? {},
  });
  await ensureProjectMeta(projectHash, input.cwd, now);
  await atomicWrite(
    sessionPath(projectHash, sessionId),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  return meta;
}
