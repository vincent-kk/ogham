import type {
  ArtifactKind,
  DataFormat,
  Encoding,
  JobStatus,
  Platform,
  RErrorCode,
  RunMode,
  SessionMode,
} from "./enums.js";

/** A reference to an input dataset the MCP resolves (LLM never builds paths). */
export interface RDataRef {
  id: string;
  format: DataFormat;
  path: string;
  encoding?: Encoding;
  sha256?: string;
}

/** run_r input contract. */
export interface RunRInput {
  scriptCode: string;
  dataRefs?: RDataRef[];
  workspaceId?: string;
  sessionMode?: SessionMode;
  executionMode?: RunMode;
  timeoutMs?: number;
  seed?: number;
}

/** A single collected artifact (hash-verified, inside ARTIFACTS_DIR). */
export interface RArtifact {
  id: string;
  kind: ArtifactKind;
  path: string;
  mimeType: string;
  sha256: string;
}

/** Parsed ARTIFACTS_DIR/manifest.json. */
export interface RArtifactManifest {
  seed?: number;
  artifacts: ManifestEntry[];
  consumedAssumptions?: string[];
  sessionInfo?: string;
}

/** A manifest entry as written by the R contract footer. */
export interface ManifestEntry {
  id: string;
  kind: ArtifactKind;
  file: string;
  description?: string;
}

/** Decoded stdout/stderr stream with provenance. */
export interface DecodedStream {
  text: string;
  truncated: boolean;
  encodingUsed: string;
}

/** Execution-safety error envelope (never statistical policy). */
export interface RExecutionError {
  code: RErrorCode;
  message: string;
  retryable: boolean;
}

/** Full result of a finished R execution. */
export interface RExecutionResult {
  exitCode: number | null;
  stdout: DecodedStream;
  stderr: DecodedStream;
  artifacts: RArtifact[];
  manifest?: RArtifactManifest;
  runtime: { rscriptPath: string; rVersion?: string; platform: Platform };
  error?: RExecutionError;
}

/** run_r / get_r_job output. */
export interface RunROutput {
  jobId: string;
  status: JobStatus;
  result?: RExecutionResult;
}
