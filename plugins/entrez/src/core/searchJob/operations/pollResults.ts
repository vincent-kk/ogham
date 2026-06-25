import type { JobStatus, ErrorCode } from "../../../types/enums.js";
import type { JobProgress } from "../../../types/job.js";
import { DEFAULT_BATCH_SIZE } from "../../../constants/defaults.js";
import { Messages } from "../../../constants/messages.js";
import { getJob } from "./getJob.js";

/** Cursor-based paging over a completed job's result set. */
export interface PollOptions {
  cursor?: string;
  pageSize?: number;
  path?: string;
}

/** Status snapshot plus one page of records when a result is present. */
export interface PollResult {
  status: JobStatus;
  partial?: boolean;
  progress?: JobProgress;
  error?: { code: ErrorCode; message: string };
  result?: unknown;
  cursor?: string;
}

/** Result shape this layer knows how to paginate (records live under `union`). */
type PaginatableResult = Record<string, unknown> & {
  union: Record<string, unknown> & { records: unknown[] };
};

/** Narrow an opaque result to the paginatable `{ union: { records: [] } }` shape. */
function isPaginatable(value: unknown): value is PaginatableResult {
  if (typeof value !== "object" || value === null) return false;
  const union = (value as { union?: unknown }).union;
  if (typeof union !== "object" || union === null) return false;
  return Array.isArray((union as { records?: unknown }).records);
}

/**
 * Read a job and project it into a poll response. Status/progress/error are
 * always returned; when the stored result carries `union.records`, the array is
 * sliced into a page and a `cursor` is emitted only while more records remain.
 * Non-paginatable results pass through verbatim with no cursor.
 */
export async function pollResults(
  jobId: string,
  options?: PollOptions,
): Promise<PollResult> {
  const job = await getJob(jobId, { path: options?.path });
  if (job === null) throw new Error(Messages.JOB_NOT_FOUND);

  const base: PollResult = {
    status: job.status,
    partial: job.partial,
    progress: job.progress,
    error: job.error,
  };

  if (!isPaginatable(job.result)) return { ...base, result: job.result };

  const records = job.result.union.records;
  const total = records.length;
  const offset = options?.cursor ? Number(options.cursor) : 0;
  const pageSize = options?.pageSize ?? DEFAULT_BATCH_SIZE;
  const nextOffset = offset + pageSize;

  // Shallow-clone so the persisted record is never mutated; replace only the page.
  const result = {
    ...job.result,
    union: { ...job.result.union, records: records.slice(offset, nextOffset) },
  };

  return {
    ...base,
    result,
    ...(nextOffset < total && { cursor: String(nextOffset) }),
  };
}
