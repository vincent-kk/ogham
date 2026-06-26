import { JobStatus, ErrorCode } from "../../../../types/enums.js";
import type {
  PaperSearchInput,
  PaperSearchStartOutput,
} from "../../../../types/tool.js";
import type { ToolContext } from "../../../shared/index.js";
import { createJob, updateJob } from "../../../../core/searchJob/index.js";
import { randomId } from "../../../../utils/randomId.js";
import { runPaperSearch } from "../paperSearch.js";
import { resolveJobPath, type JobRunOptions } from "./jobLocation.js";

/**
 * Execute the search and persist its terminal state. Exported for deterministic
 * testing; in production it runs detached from `startJob`.
 */
export async function runJob(
  jobId: string,
  input: PaperSearchInput,
  ctx: ToolContext,
  options: JobRunOptions = {},
): Promise<void> {
  const path = resolveJobPath(jobId, options.dir);
  await updateJob(
    jobId,
    { status: JobStatus.RUNNING },
    { nowMs: ctx.nowMs, path },
  );
  try {
    const result = await runPaperSearch(input, ctx);
    await updateJob(
      jobId,
      {
        status: result.partial ? JobStatus.PARTIAL : JobStatus.SUCCEEDED,
        result,
        partial: result.partial,
      },
      { nowMs: ctx.nowMs, path },
    );
  } catch (error) {
    await updateJob(
      jobId,
      {
        status: JobStatus.FAILED,
        error: {
          code: ErrorCode.UNKNOWN,
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { nowMs: ctx.nowMs, path },
    );
  }
}

/**
 * paper-search-start — register a QUEUED job, kick off the search (detached by
 * default), and return the job id immediately so large searches don't hit the
 * MCP synchronous timeout.
 */
export async function startJob(
  input: PaperSearchInput,
  ctx: ToolContext,
  options: JobRunOptions = {},
): Promise<PaperSearchStartOutput> {
  const jobId = randomId();
  const path = resolveJobPath(jobId, options.dir);
  const job = await createJob(input, { id: jobId, nowMs: ctx.nowMs, path });

  const run = runJob(jobId, input, ctx, options);
  if (options.awaitRun) await run;
  else void run.catch(() => {});

  return { jobId, status: job.status };
}
