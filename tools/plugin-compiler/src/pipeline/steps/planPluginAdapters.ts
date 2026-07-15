import { join } from "node:path";
import {
  buildAgyHooks,
  buildAgyMcpConfig,
  buildCodexPluginManifest,
} from "../../adapters/index.js";
import {
  AGY_HOOKS_PATH,
  AGY_MCP_CONFIG_PATH,
  CODEX_MANIFEST_PATH,
  ROOT_MANIFEST_PATH,
} from "../../constants/adapterPaths.js";
import { readPluginFacts } from "../../facts/index.js";
import { lintHookEvents, lintHookMatchers } from "../../lint/index.js";
import type { AdapterPlan, GeneratedFile } from "../../types/index.js";
import { stableJson } from "../../utils/stableJson.js";

export function planPluginAdapters(directory: string): AdapterPlan {
  const facts = readPluginFacts(directory);
  const diagnostics = [...lintHookEvents(facts), ...lintHookMatchers(facts)];

  try {
    // One manifest, two locations — the plugin root copy is agy's marker and is
    // also what Codex actually reads (it shadows .codex-plugin). Same bytes, so
    // the hosts cannot diverge. See constants/adapterPaths.ts.
    const manifest = stableJson(buildCodexPluginManifest(facts));
    const files: GeneratedFile[] = [
      {
        absolutePath: join(directory, CODEX_MANIFEST_PATH),
        content: manifest,
      },
      {
        absolutePath: join(directory, ROOT_MANIFEST_PATH),
        content: manifest,
      },
    ];
    const agyMcpConfig = buildAgyMcpConfig(facts);
    if (agyMcpConfig)
      files.push({
        absolutePath: join(directory, AGY_MCP_CONFIG_PATH),
        content: stableJson(agyMcpConfig),
      });
    const agyHooks = buildAgyHooks(facts);
    if (agyHooks)
      files.push({
        absolutePath: join(directory, AGY_HOOKS_PATH),
        content: stableJson(agyHooks),
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
