import {
  sessionMetaPath,
  sessionViewerPath,
} from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { SessionStatus } from "../../../types/enums.js";
import type { RenderOptions } from "../../../types/renderOptions.js";
import { type SessionMeta, SessionMetaSchema } from "../../../types/session.js";

export interface CreateSessionInput {
  sessionId: string;
  projectHash: string;
  title: string;
  url: string;
  markdown: string;
  createdAt: string;
  options?: RenderOptions;
}

/** Persist a new render session: raw viewer.md + meta.json. */
export async function createSession(
  input: CreateSessionInput,
): Promise<SessionMeta> {
  const meta = SessionMetaSchema.parse({
    session_id: input.sessionId,
    project_hash: input.projectHash,
    title: input.title,
    url: input.url,
    created_at: input.createdAt,
    status: SessionStatus.Serving,
    options: input.options,
  });
  await atomicWrite(sessionViewerPath(input.sessionId), input.markdown);
  await atomicWrite(
    sessionMetaPath(input.sessionId),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  return meta;
}
