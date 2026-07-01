import {
  DEFAULT_TIMEOUT_MS,
  MAX_DATA_REFS,
  MAX_SCRIPT_CHARS,
  MAX_TIMEOUT_MS,
} from "../../../constants/defaults.js";
import {
  ERROR_MESSAGES,
  FORBIDDEN_CALL_MESSAGE,
} from "../../../constants/messages.js";
import { workspaceScriptPath } from "../../../constants/paths.js";
import {
  createJob,
  createWorkspace,
  discoverRscript,
  hasActiveWorkspaceJob,
  updateJob,
  validateRScript,
} from "../../../core/index.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import {
  Encoding,
  JobStatus,
  RErrorCode,
  RunMode,
  SessionMode,
} from "../../../types/enums.js";
import type {
  RExecutionError,
  RExecutionResult,
  RunRInput,
  RunROutput,
} from "../../../types/rExecution.js";
import { detectPlatform } from "../../../utils/detectPlatform.js";
import { randomId } from "../../../utils/randomId.js";

import { buildRunEnv } from "./operations/buildRunEnv.js";
import { buildWrapperScript } from "./operations/buildWrapperScript.js";
import { executeRun } from "./operations/executeRun.js";
import { resolveDataRefs } from "./operations/resolveDataRefs.js";

function clampTimeout(value: number | undefined): number {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(ERROR_MESSAGES.INVALID_TIMEOUT);

  return Math.min(value, MAX_TIMEOUT_MS);
}

function errorResult(
  error: RExecutionError,
  rscriptPath: string,
): RExecutionResult {
  return {
    exitCode: null,
    stdout: { text: "", truncated: false, encodingUsed: Encoding.Utf8 },
    stderr: {
      text: error.message,
      truncated: false,
      encodingUsed: Encoding.Utf8,
    },
    artifacts: [],
    runtime: { rscriptPath, platform: detectPlatform() },
    error,
  };
}

/** Register a synthetic failed job for pre-execution failures (blocked / R missing). */
function failFast(error: RExecutionError, rscriptPath: string): RunROutput {
  const jobId = randomId("job_");
  createJob({ jobId, workspaceId: "", controller: new AbortController() });
  const result = errorResult(error, rscriptPath);
  updateJob(jobId, JobStatus.Failed, result);
  return { jobId, status: JobStatus.Failed, result };
}

/**
 * run_r: execute LLM-generated R code in an isolated workspace via headless
 * Rscript. Statically gates forbidden calls, resolves input data, injects the
 * execution contract, and runs sync (await) or async (poll via get_r_job).
 * Execution safety only — statistical policy is the assert tool's concern.
 */
export async function handleRunR(input: RunRInput): Promise<RunROutput> {
  if (!input.scriptCode || !input.scriptCode.trim())
    throw new Error(ERROR_MESSAGES.EMPTY_SCRIPT);

  if (input.scriptCode.length > MAX_SCRIPT_CHARS)
    throw new Error(ERROR_MESSAGES.SCRIPT_TOO_LARGE);

  if (input.dataRefs && input.dataRefs.length > MAX_DATA_REFS)
    throw new Error(ERROR_MESSAGES.TOO_MANY_DATA_REFS);

  const sessionMode = input.sessionMode ?? SessionMode.Stateless;
  if (sessionMode === SessionMode.WorkspaceFiles && !input.workspaceId)
    throw new Error(ERROR_MESSAGES.WORKSPACE_FILES_REQUIRES_ID);

  if (
    sessionMode !== SessionMode.WorkspaceFiles &&
    input.workspaceId &&
    hasActiveWorkspaceJob(input.workspaceId)
  )
    throw new Error(ERROR_MESSAGES.WORKSPACE_BUSY);

  const timeoutMs = clampTimeout(input.timeoutMs);

  const validation = validateRScript(input.scriptCode);
  if (!validation.ok)
    return failFast(
      {
        code: RErrorCode.CommandBlocked,
        message: FORBIDDEN_CALL_MESSAGE(validation.blockedCalls.join(", ")),
        retryable: false,
      },
      "",
    );

  const rscriptPath = discoverRscript();
  if (!rscriptPath)
    return failFast(
      {
        code: RErrorCode.RNotFound,
        message: ERROR_MESSAGES.R_NOT_FOUND,
        retryable: false,
      },
      "",
    );

  const workspace = await createWorkspace(input.workspaceId, {
    reset: sessionMode !== SessionMode.WorkspaceFiles,
  });
  await resolveDataRefs(workspace.dataDir, input.dataRefs);
  await atomicWrite(
    workspaceScriptPath(workspace.workspaceId),
    buildWrapperScript(input.scriptCode),
  );

  const controller = new AbortController();
  const jobId = randomId("job_");
  createJob({ jobId, workspaceId: workspace.workspaceId, controller });

  const runArgs = {
    workspace,
    rscriptPath,
    scriptPath: workspaceScriptPath(workspace.workspaceId),
    env: buildRunEnv(workspace, input.seed),
    timeoutMs,
    signal: controller.signal,
  };

  updateJob(jobId, JobStatus.Running);

  if ((input.executionMode ?? RunMode.Async) === RunMode.Sync) {
    const { status, result } = await executeRun(runArgs);
    updateJob(jobId, status, result);
    return { jobId, status, result };
  }

  void executeRun(runArgs)
    .then(({ status, result }) => updateJob(jobId, status, result))
    .catch((error: unknown) =>
      updateJob(
        jobId,
        JobStatus.Failed,
        errorResult(
          {
            code: RErrorCode.ProcessFailed,
            message: (error as Error).message,
            retryable: false,
          },
          rscriptPath,
        ),
      ),
    );
  return { jobId, status: JobStatus.Running };
}
