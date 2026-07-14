import { join } from "node:path";
import {
  buildAgyMcpConfig,
  buildCodexPluginManifest,
} from "../../adapters/index.js";
import {
  AGY_MCP_CONFIG_PATH,
  CODEX_MANIFEST_PATH,
} from "../../constants/hosts.js";
import { readPluginFacts } from "../../facts/index.js";
import { stableJson } from "../../json/stableJson.js";
import { lintHookEvents } from "../../lint/lintHookEvents.js";
import { lintHookMatchers } from "../../lint/lintHookMatchers.js";
import type { AdapterPlan, GeneratedFile } from "../../types/adapter.js";

/** Plans one plugin's adapter files; MCP portability violations become error diagnostics. */
export function planPluginAdapters(directory: string): AdapterPlan {
  const facts = readPluginFacts(directory);
  const diagnostics = [...lintHookEvents(facts), ...lintHookMatchers(facts)];

  try {
    const files: GeneratedFile[] = [
      {
        absolutePath: join(directory, CODEX_MANIFEST_PATH),
        content: stableJson(buildCodexPluginManifest(facts)),
      },
    ];
    const agyMcpConfig = buildAgyMcpConfig(facts);
    if (agyMcpConfig)
      files.push({
        absolutePath: join(directory, AGY_MCP_CONFIG_PATH),
        content: stableJson(agyMcpConfig),
      });
    return { files, diagnostics };
  } catch (error) {
    diagnostics.push({
      level: "error",
      code: "mcp-variable-args",
      message: `${facts.name}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { files: [], diagnostics };
  }
}
