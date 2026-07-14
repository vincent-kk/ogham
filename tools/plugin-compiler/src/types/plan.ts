export interface GeneratedFile {
  absolutePath: string;
  content: string;
}

export type DiagnosticLevel = "error" | "warning";

export interface Diagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
}

export interface AdapterPlan {
  files: GeneratedFile[];
  diagnostics: Diagnostic[];
}

export type FileAction =
  | "created"
  | "updated"
  | "unchanged"
  | "stale"
  | "missing";

export interface FileOutcome {
  absolutePath: string;
  action: FileAction;
}
