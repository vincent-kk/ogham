import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  AsyncAgentLifecycleError,
  buildAgyHooks,
  buildAgyMcpConfig,
  buildCodexHooks,
  buildCodexPluginManifest,
  buildCodexSkills,
} from "../../adapters/index.js";
import {
  AGY_HOOKS_PATH,
  AGY_MCP_CONFIG_PATH,
  CODEX_HOOKS_PATH,
  CODEX_MANIFEST_PATH,
  ROOT_MANIFEST_PATH,
} from "../../constants/adapterPaths.js";
import { CLAUDE_MANIFEST_PATH } from "../../constants/claudeArtifacts.js";
import { readPluginFacts } from "../../facts/index.js";
import { lintHookEvents, lintHookMatchers } from "../../lint/index.js";
import type { AdapterPlan, GeneratedFile } from "../../types/index.js";
import { stableJson } from "../../utils/stableJson.js";

export function planPluginAdapters(directory: string): AdapterPlan {
  // Caller-supplied directories (CLI args in parseCommand.ts) are resolved
  // but never existence-checked — this is the same manifest-presence gate
  // listPluginDirectories.ts applies to auto-discovered directories. Without
  // it, readPluginFacts's unguarded readFileSync throws a raw ENOENT that
  // bypasses Diagnostic/formatDiagnostics and crashes the CLI.
  const manifestPath = join(directory, CLAUDE_MANIFEST_PATH);
  if (!existsSync(manifestPath))
    return {
      files: [],
      diagnostics: [
        {
          level: "error",
          code: "plugin-directory-not-found",
          message: `directory not found or not a plugin (missing manifest): ${manifestPath}`,
        },
      ],
    };

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
    const codexHooks = buildCodexHooks(facts);
    if (codexHooks)
      files.push({
        absolutePath: join(directory, CODEX_HOOKS_PATH),
        content: stableJson(codexHooks),
      });
    // Codex skill variant: a whole `.codex-plugin/skills/` tree of raw markdown
    // (not stableJson — these are copied/rewritten skill files, not JSON).
    const codexSkills = buildCodexSkills(facts);
    if (codexSkills)
      for (const { relativePath, content } of codexSkills)
        files.push({
          absolutePath: join(directory, relativePath),
          content,
        });
    return { files, diagnostics };
  } catch (error) {
    diagnostics.push({
      level: "error",
      code:
        error instanceof AsyncAgentLifecycleError
          ? "codex-skill-lifecycle"
          : "mcp-variable-args",
      message: `${facts.name}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { files: [], diagnostics };
  }
}
