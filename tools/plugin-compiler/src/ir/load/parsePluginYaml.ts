import { parse } from "yaml";
import type { HookFallback, McpIR } from "../../types/ir.js";

/** The manifest-level fields a `plugin.yaml` supplies (version comes from package.json). */
export interface PluginManifestFields {
  name: string;
  description: string;
  keywords?: string[];
  author?: { name: string; email?: string };
  license?: string;
  repository?: string;
  homepage?: string;
  store?: Record<string, unknown>;
  mcp?: McpIR;
  /**
   * Optional per-event hook fallback overrides, e.g. `{ SessionEnd: mcp-lifecycle }`.
   * Overrides parseHooks' event defaults so a plugin can declare how a host that
   * lacks the event should rewire it. See `HookFallback`.
   */
  hookOverrides?: Record<string, HookFallback>;
}

/** Parse `definitions/plugin.yaml` into host-neutral manifest fields. */
export function parsePluginYaml(text: string): PluginManifestFields {
  const y = (parse(text) ?? {}) as Record<string, unknown>;
  if (typeof y.name !== "string" || typeof y.description !== "string")
    throw new Error("plugin.yaml requires string `name` and `description`");

  const raw = y.mcp as
    | { server?: string; entry?: string; transport?: "stdio" }
    | undefined;
  const mcp: McpIR | undefined =
    raw?.server && raw?.entry
      ? {
          server: raw.server,
          entry: raw.entry,
          ...(raw.transport ? { transport: raw.transport } : {}),
        }
      : undefined;

  return {
    name: y.name,
    description: y.description,
    keywords: y.keywords as string[] | undefined,
    author: y.author as { name: string; email?: string } | undefined,
    license: y.license as string | undefined,
    repository: y.repository as string | undefined,
    homepage: y.homepage as string | undefined,
    store: y.store as Record<string, unknown> | undefined,
    mcp,
    hookOverrides: y.hooks as Record<string, HookFallback> | undefined,
  };
}
