import type {
  TOOL_ARTIFACT_EPHEMERAL,
  TOOL_MEDIA_TYPES,
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../constants/toolEnvelope.js';

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
