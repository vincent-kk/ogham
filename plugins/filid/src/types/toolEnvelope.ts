import {
  TOOL_ARTIFACT_EPHEMERAL,
  TOOL_MEDIA_TYPES,
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../constants/toolEnvelope.js';

type ValueOf<T> = T[keyof T];

export type ToolStatus = ValueOf<typeof TOOL_STATUSES>;
export type ToolMediaType = ValueOf<typeof TOOL_MEDIA_TYPES>;
export type ToolPersistence = ValueOf<typeof TOOL_PERSISTENCE>;

export interface ToolArtifact {
  path: string;
  mediaType: ToolMediaType;
  sha256: string;
  bytes: number;
  ephemeral: typeof TOOL_ARTIFACT_EPHEMERAL;
}

export interface ToolDiagnostic {
  code: string;
  message: string;
  path?: string;
}

export interface ToolPayload<Summary, Data> {
  projectRoot: string;
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  diagnostics: ToolDiagnostic[];
  persistence?: ToolPersistence;
}

export interface ToolResultEnvelope<Summary, Data> {
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  artifact?: ToolArtifact;
  diagnostics: ToolDiagnostic[];
}
