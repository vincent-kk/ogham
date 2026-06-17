import { randomUUID } from 'node:crypto';

import { sessionPath } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import {
  type Provider,
  type SessionMeta,
  SessionMetaSchema,
} from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';
import { getProjectHash } from '../../projectHash/index.js';
import { ensureProjectMeta } from '../utils/ensureProjectMeta.js';

export interface CreateSessionInput {
  sessionId?: string;
  provider: Provider;
  cwd: string;
  externalSessionRef: string;
  model: string;
  options?: Record<string, unknown>;
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
