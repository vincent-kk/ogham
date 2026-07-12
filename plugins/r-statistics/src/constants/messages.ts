// All user-facing and error message strings. Inline message literals are
// forbidden elsewhere — import from here.

export const ERROR_MESSAGES = {
  R_NOT_FOUND:
    "Rscript was not found. Run the setup skill to install R or set " +
    "R_STATISTICS_RSCRIPT to the Rscript path.",
  INVALID_TIMEOUT:
    "timeoutMs must be a positive number within the allowed ceiling.",
  EMPTY_SCRIPT: "scriptCode must be a non-empty R script.",
  JOB_NOT_FOUND: "No R job exists for the given jobId.",
  WORKSPACE_NOT_FOUND: "The referenced workspace does not exist.",
  COMMAND_BLOCKED: "The requested command is not on the approved whitelist.",
  ARTIFACT_OUTSIDE_DIR:
    "Refusing to collect an artifact outside ARTIFACTS_DIR (path traversal or symlink escape).",
  OUTPUT_DECODE_FAILED:
    "Process output could not be decoded as UTF-8 or CP949.",
  DATA_REF_NOT_FOUND:
    "A referenced input dataset could not be resolved on disk.",
  INVALID_DATA_REF_ID:
    "A data ref id must be alphanumeric (with _ or -) and contain no path separators.",
  INVALID_WORKSPACE_ID:
    "A workspace id must be alphanumeric (with _ or -) and contain no path separators.",
  WORKSPACE_FILES_REQUIRES_ID:
    "sessionMode 'workspace_files' requires a workspaceId to address the persistent session.",
  WORKSPACE_BUSY:
    "The workspace is in use by an active job and cannot be reset; wait for it to finish or use a different workspaceId.",
  SCRIPT_TOO_LARGE: "scriptCode exceeds the maximum allowed size.",
  TOO_MANY_DATA_REFS: "dataRefs exceeds the maximum allowed number of entries.",
  DATA_REF_OUTSIDE_ROOT:
    "Refusing to read an input dataset outside the allowed data root " +
    "(absolute path required; set R_STATISTICS_DATA_ROOT to widen it). " +
    "System paths like /etc or ~/.ssh are rejected.",
  DATA_ROOT_INVALID:
    "R_STATISTICS_DATA_ROOT does not resolve to an existing directory.",
} as const;

export const TIMEOUT_MESSAGE =
  "R execution exceeded the timeout and was terminated.";

export const PROCESS_FAILED_MESSAGE = (exitCode: number | null): string =>
  `Rscript exited with a non-zero status (${exitCode}).`;

export const FORBIDDEN_CALL_MESSAGE = (call: string): string =>
  `Blocked R call '${call}': process, filesystem-escape, install, and network ` +
  `calls are not permitted in executed scripts.`;

export const INSTALLER_NOT_AVAILABLE = (manager: string): string =>
  `No approved installer mapping for '${manager}'. Supported: winget, choco, brew.`;
