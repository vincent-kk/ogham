import { z } from "zod";

import { SessionStatus } from "./enums.js";
import { RenderOptionsSchema } from "./renderOptions.js";

export const SessionStatusSchema = z.nativeEnum(SessionStatus);

export const SessionMetaSchema = z.object({
  session_id: z.string(),
  project_hash: z.string(),
  title: z.string(),
  url: z.string(),
  created_at: z.string(),
  status: SessionStatusSchema,
  options: RenderOptionsSchema.optional(),
});
export type SessionMeta = z.infer<typeof SessionMetaSchema>;
