import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../../config/config-loader/config-loader.js";
import { CONFIG_DIR, CONFIG_FILE } from "../../constants/config.js";
import { VAULT_STATUS } from "../../constants/vault-status.js";
import { detectStale } from "../../vault/stale-detector/stale-detector.js";

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
- /maencof-lens:maencof-lens-lookup <keyword> — single-doc retrieval + summary
- /maencof-lens:maencof-lens-context <query> — token-budgeted multi-doc assembly
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

async function resolveVaultStatus(vaultPath: string): Promise<string> {
  if (!existsSync(vaultPath)) {
    return VAULT_STATUS.PATH_NOT_FOUND;
  }

  try {
    const staleInfo = await detectStale(vaultPath);
    if (staleInfo.markerKind === "legacy") {
      return VAULT_STATUS.LEGACY_V1;
    }
    if (staleInfo.markerKind === null) {
      return VAULT_STATUS.INDEX_NOT_BUILT;
    }
    if (staleInfo.isStale) {
      return `${VAULT_STATUS.STALE} (${staleInfo.staleSince ?? "unknown"})`;
    }
    return VAULT_STATUS.READY;
  } catch {
    return VAULT_STATUS.UNKNOWN;
  }
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
      "[maencof-lens] Warning: Invalid config at .maencof-lens/config.json",
    );
  }

  const vaultLines: string[] = [];
  for (const vault of config.vaults) {
    const status = await resolveVaultStatus(vault.path);
    const defaultTag = vault.default ? " [default]" : "";
    vaultLines.push(`- ${vault.name} (${vault.path})${defaultTag} — ${status}`);
  }

  return makeResult(
    SESSION_TEMPLATE.replace("{{vaults}}", vaultLines.join("\n")),
  );
}
