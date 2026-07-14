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
