export interface McpServerSource {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface HookCommandSource {
  command?: string;
}

export interface HookMatcherGroup {
  matcher?: string;
  hooks?: HookCommandSource[];
}

export interface HooksFileSource {
  hooks?: Record<string, HookMatcherGroup[]>;
}
