import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../config/config-loader.js";
import { CONFIG_DIR, CONFIG_FILE } from "../config/defaults.js";
import { detectStale } from "../vault/stale-detector.js";

export interface LensSessionStartResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: "SessionStart";
    additionalContext?: string;
  };
}

const SESSION_TEMPLATE = `[maencof-lens] Read-only vault access enabled.

<vaults>
{{vaults}}
</vaults>

<capabilities>
- /maencof-lens:lookup <keyword> — single-doc retrieval + summary
- /maencof-lens:context <query> — token-budgeted multi-doc assembly
- "vault research" or "vault explore" — autonomous researcher agent
</capabilities>

<constraints>
- Read-only. Vault writes require a maencof session.
- Layer filter: L2-L5 (L1 excluded).
</constraints>`;

function makeResult(additionalContext: string): LensSessionStartResult {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  };
}

export async function runSessionStart(
  cwd: string,
): Promise<LensSessionStartResult> {
  const configPath = join(cwd, CONFIG_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) {
    return { continue: true };
  }

  const config = loadConfig(cwd);
  if (!config) {
    return makeResult(
      "[maencof:lens] Warning: Invalid config at .maencof-lens/config.json",
    );
  }

  const vaultLines: string[] = [];
  for (const vault of config.vaults) {
    const pathExists = existsSync(vault.path);
    const indexExists =
      pathExists && existsSync(join(vault.path, ".maencof", "index.json"));
    let status = "ready";

    if (!pathExists) {
      status = "path not found";
    } else if (!indexExists) {
      status = "index not built";
    } else {
      try {
        const staleInfo = await detectStale(vault.path);
        if (staleInfo.isStale) {
          status = `stale (${staleInfo.staleSince ?? "unknown"})`;
        }
      } catch {
        status = "ready";
      }
    }

    const defaultTag = vault.default ? " [default]" : "";
    vaultLines.push(`- ${vault.name} (${vault.path})${defaultTag} — ${status}`);
  }

  return makeResult(
    SESSION_TEMPLATE.replace("{{vaults}}", vaultLines.join("\n")),
  );
}
