export interface McpServerSource {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface HookMatcherGroup {
  matcher?: string;
}

export interface HooksFileSource {
  hooks?: Record<string, HookMatcherGroup[]>;
}

export interface PluginFacts {
  directory: string;
  name: string;
  manifest: Record<string, unknown>;
  hasSkills: boolean;
  hasHooks: boolean;
  hooksFile: HooksFileSource | null;
  mcpServers: Record<string, McpServerSource> | null;
}

export interface MarketplacePluginFacts {
  name: string;
  source: string;
  category?: string;
}

export interface MarketplaceFacts {
  name: string;
  plugins: MarketplacePluginFacts[];
}

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
