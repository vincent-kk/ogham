/**
 * @file job.ts
 * @description Async search job record (disk-persisted registry). Large
 * searches run as jobs so they don't exceed MCP's synchronous timeout.
 */
import { z } from "zod";

import { JobStatusSchema, ErrorCodeSchema } from "./enumSchemas.js";

export const JobProgressSchema = z.object({
  fetched: z.number().int(),
  total: z.number().int(),
  currentSegment: z.number().int().optional(),
  segments: z.number().int(),
});
export type JobProgress = z.infer<typeof JobProgressSchema>;

export const JobRecordSchema = z.object({
  jobId: z.string(),
  status: JobStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Stored PaperSearchInput (opaque at this layer). */
  input: z.unknown(),
  progress: JobProgressSchema.optional(),
  partial: z.boolean().optional(),
  error: z.object({ code: ErrorCodeSchema, message: z.string() }).optional(),
  /** Stored PaperSearchOutput when complete (opaque at this layer). */
  result: z.unknown().optional(),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;
