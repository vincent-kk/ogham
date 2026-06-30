import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../../config/configLoader/configLoader.js";
import { CONFIG_DIR, CONFIG_FILE } from "../../constants/config.js";
import { VAULT_STATUS } from "../../constants/vaultStatus.js";
import { detectStale } from "../../vault/staleDetector/staleDetector.js";

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
- /maencof-lens:brief <query> — token-budgeted multi-doc assembly
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
  const staleVaults: string[] = [];
  for (const vault of config.vaults) {
    const status = await resolveVaultStatus(vault.path);
    const defaultTag = vault.default ? " [default]" : "";
    vaultLines.push(`- ${vault.name} (${vault.path})${defaultTag} — ${status}`);
    if (
      status.startsWith(VAULT_STATUS.STALE) ||
      status === VAULT_STATUS.INDEX_NOT_BUILT ||
      status === VAULT_STATUS.LEGACY_V1
    )
      staleVaults.push(vault.name);
  }

  const base = SESSION_TEMPLATE.replace("{{vaults}}", vaultLines.join("\n"));
  if (staleVaults.length === 0) return makeResult(base);

  // lens is read-only and cannot rebuild — surface an actionable directive so the
  // operator refreshes the index from a maencof session before relying on search
  // (a stale index can hide recently edited or new docs such as the latest handoff).
  const advisory = `
<stale-index-advisory>
Stale or unbuilt vault index: ${staleVaults.join(", ")}.
maencof-lens is read-only and cannot rebuild the index. Run \`kg_build\` in a maencof session on the affected vault to refresh. Until then, recently edited or new documents (e.g. the latest handoff) may be missing from lookup / brief / search results — verify freshness before relying on them.
</stale-index-advisory>`;
  return makeResult(base + advisory);
}
