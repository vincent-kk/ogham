import { join } from "node:path";
import { buildCodexMarketplace } from "../../adapters/index.js";
import { CODEX_MARKETPLACE_PATH } from "../../constants/adapterPaths.js";
import { readMarketplaceFacts } from "../../facts/index.js";
import type { AdapterPlan } from "../../types/index.js";
import { stableJson } from "../../utils/stableJson.js";

export function planRootAdapters(rootDirectory: string): AdapterPlan {
  const facts = readMarketplaceFacts(rootDirectory);
  return {
    files: [
      {
        absolutePath: join(rootDirectory, CODEX_MARKETPLACE_PATH),
        content: stableJson(buildCodexMarketplace(facts)),
      },
    ],
    diagnostics: [],
  };
}
