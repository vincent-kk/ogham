import { z } from "zod";

import { RenderOptionsSchema } from "./renderOptions.js";

export const SessionStatusSchema = z.enum(["serving", "closed"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

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
