import { sessionPath } from '../../constants/paths.js';
import { atomicWrite } from '../../lib/atomicWrite.js';
import { type SessionMeta, SessionMetaSchema } from '../../types/index.js';

export async function updateSession(meta: SessionMeta): Promise<SessionMeta> {
  const validated = SessionMetaSchema.parse(meta);
  await atomicWrite(
    sessionPath(validated.project_hash, validated.session_id),
    `${JSON.stringify(validated, null, 2)}\n`,
  );
  return validated;
}
