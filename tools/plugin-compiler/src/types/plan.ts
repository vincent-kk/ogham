export interface GeneratedFile {
  absolutePath: string;
  content: string;
}

/**
 * One file of a Codex skill-variant tree, addressed by its path relative to the
 * plugin directory. `buildCodexSkills` is pure (no directory knowledge), so the
 * pipeline resolves each `relativePath` against the plugin dir before writing.
 */
export interface CodexSkillFile {
  relativePath: string;
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
