import { access } from "node:fs/promises";
import { join } from "node:path";

import {
  collectArtifacts,
  decodeOutput,
  readManifest,
  spawnRscript,
  type SpawnRscriptResult,
  type WorkspaceHandle,
} from "../../../../core/index.js";
import {
  ERROR_MESSAGES,
  PROCESS_FAILED_MESSAGE,
  TIMEOUT_MESSAGE,
} from "../../../../constants/messages.js";
import {
  Encoding,
  JobStatus,
  Platform,
  RErrorCode,
} from "../../../../types/enums.js";
import type {
  RArtifact,
  RExecutionError,
  RExecutionResult,
} from "../../../../types/rExecution.js";
import { detectPlatform } from "../../../../utils/detectPlatform.js";

const WINDOWS_ACCESS_VIOLATION_EXIT_CODE = 3221225477;
const FINALIZE_SENTINEL_FILE = "finalize.ok";

export interface ExecuteRunInput {
  workspace: WorkspaceHandle;
  rscriptPath: string;
  scriptPath: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  signal: AbortSignal;
}

export interface ExecuteRunOutput {
  status: JobStatus;
  result: RExecutionResult;
}

function classify(
  spawn: SpawnRscriptResult,
  policyError: RExecutionError | undefined,
  platform: Platform,
  finalizeSucceeded: boolean,
): { status: JobStatus; error?: RExecutionError } {
  if (spawn.aborted) return { status: JobStatus.Cancelled };
  if (spawn.timedOut) {
    return {
      status: JobStatus.Timeout,
      error: {
        code: RErrorCode.Timeout,
        message: TIMEOUT_MESSAGE,
        retryable: true,
      },
    };
  }
  if (spawn.spawnError) {
    return {
      status: JobStatus.Failed,
      error: {
        code: RErrorCode.ProcessFailed,
        message: spawn.spawnError.message,
        retryable: false,
      },
    };
  }
  if (policyError) return { status: JobStatus.Failed, error: policyError };
  if (
    platform === Platform.Windows &&
    spawn.exitCode === WINDOWS_ACCESS_VIOLATION_EXIT_CODE &&
    finalizeSucceeded
  ) {
    return { status: JobStatus.Succeeded };
  }
  if (spawn.exitCode === 0) return { status: JobStatus.Succeeded };
  return {
    status: JobStatus.Failed,
    error: {
      code: RErrorCode.ProcessFailed,
      message: PROCESS_FAILED_MESSAGE(spawn.exitCode),
      retryable: true,
    },
  };
}

async function hasFinalizeSentinel(artifactsDir: string): Promise<boolean> {
  try {
    await access(join(artifactsDir, FINALIZE_SENTINEL_FILE));
    return true;
  } catch {
    return false;
  }
}

/**
 * Run the wrapped script and assemble the full execution result: decode output,
 * parse the manifest, collect artifacts (policy-gated), and classify the
 * terminal status. Never throws — spawn errors become a PROCESS_FAILED result.
 */
export async function executeRun(
  input: ExecuteRunInput,
): Promise<ExecuteRunOutput> {
  const platform = detectPlatform();
  let spawn: SpawnRscriptResult;
  try {
    spawn = await spawnRscript({
      rscriptPath: input.rscriptPath,
      scriptPath: input.scriptPath,
      cwd: input.workspace.dir,
      env: input.env,
      timeoutMs: input.timeoutMs,
      signal: input.signal,
    });
  } catch (error) {
    return {
      status: JobStatus.Failed,
      result: {
        exitCode: null,
        stdout: { text: "", truncated: false, encodingUsed: Encoding.Utf8 },
        stderr: {
          text: (error as Error).message,
          truncated: false,
          encodingUsed: Encoding.Utf8,
        },
        artifacts: [],
        runtime: { rscriptPath: input.rscriptPath, platform },
        error: {
          code: RErrorCode.ProcessFailed,
          message: (error as Error).message,
          retryable: false,
        },
      },
    };
  }

  const manifest = await readManifest(input.workspace.workspaceId);
  let artifacts: RArtifact[] = [];
  let policyError: RExecutionError | undefined;
  try {
    artifacts = await collectArtifacts(input.workspace.workspaceId, manifest);
  } catch {
    policyError = {
      code: RErrorCode.ArtifactPolicyFailed,
      message: ERROR_MESSAGES.ARTIFACT_OUTSIDE_DIR,
      retryable: false,
    };
  }

  const finalizeSucceeded = await hasFinalizeSentinel(
    input.workspace.artifactsDir,
  );
  const { status, error } = classify(
    spawn,
    policyError,
    platform,
    finalizeSucceeded,
  );
  return {
    status,
    result: {
      exitCode: spawn.exitCode,
      stdout: decodeOutput(spawn.stdout),
      stderr: decodeOutput(spawn.stderr),
      artifacts,
      manifest,
      runtime: { rscriptPath: input.rscriptPath, platform },
      error,
    },
  };
}
