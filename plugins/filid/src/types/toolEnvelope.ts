import type {
  TOOL_ARTIFACT_EPHEMERAL,
  TOOL_MEDIA_TYPES,
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../constants/toolEnvelope.js';

import type { AnalysisAxis } from './fractal.js';

type ValueOf<T> = T[keyof T];

/** Subset of MCP request metadata forwarded to tool handlers. */
export interface HandlerExtra {
  signal?: AbortSignal;
}

/** Status values returned by every Filid tool payload. */
export type ToolStatus = ValueOf<typeof TOOL_STATUSES>;
/** Media types supported by persisted tool artifacts. */
export type ToolMediaType = ValueOf<typeof TOOL_MEDIA_TYPES>;
/** Persistence policies supported by the common tool envelope. */
export type ToolPersistence = ValueOf<typeof TOOL_PERSISTENCE>;

/** Metadata that identifies one persisted tool artifact. */
export interface ToolArtifact {
  path: string;
  mediaType: ToolMediaType;
  sha256: string;
  bytes: number;
  ephemeral: typeof TOOL_ARTIFACT_EPHEMERAL;
}

/** One stable diagnostic returned by a tool boundary. */
export interface ToolDiagnostic {
  code: string;
  message: string;
  path?: string;
  /** Axes whose conclusions this diagnostic can change; `[]` means none. */
  affects: readonly AnalysisAxis[];
  /** Producer-owned identity shared by repeated observations of one cause. */
  causeId?: string;
  /** Unresolved dependency target as written by the consumer. */
  specifier?: string;
  /**
   * 1-based line the caller has to read, when one line decides the answer.
   *
   * Set by a producer that knows which line its refusal is about — a disputed
   * reference, say — so the caller does not have to search the file for it.
   */
  line?: number;
  /**
   * Who decides what happens next: `agent` when nothing needs a person.
   *
   * Stated rather than implied, because a diagnostic that reads like a request
   * is how a flow ends up waiting on somebody who was never asked.
   */
  owner?: string;
  /**
   * What the caller does next: the fix to make, the step filid leaves to the
   * caller, or who must decide.
   */
  nextAction: string;
}

/** Handler-level payload before common envelope materialization. */
export interface ToolPayload<Summary, Data> {
  projectRoot: string;
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  diagnostics: ToolDiagnostic[];
  persistence?: ToolPersistence;
}

/** Public result envelope serialized into MCP text content. */
export interface ToolResultEnvelope<Summary, Data> {
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  artifact?: ToolArtifact;
  diagnostics: ToolDiagnostic[];
}
