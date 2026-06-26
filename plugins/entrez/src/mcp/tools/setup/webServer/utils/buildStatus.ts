import type { Db, RateLimit } from "../../../../../types/enums.js";
import type { EntrezConfig, EntrezCredentials } from "../../../../../types/config.js";
import { resolveRateLimit } from "../../../../../core/config/index.js";
import { maskApiKey } from "./maskApiKey.js";

export interface SetupStatus {
  configured: boolean;
  tool?: string;
  email?: string;
  default_db?: Db;
  base_url?: string;
  output_path?: string;
  date_tag?: boolean;
  default_date_range?: { from?: string; to?: string };
  /** Masked (never the real api_key). */
  api_key?: string;
  rateLimit: RateLimit;
}

/** Build the prefill/status view of current settings (api_key masked). */
export function buildStatus(
  config: EntrezConfig | null,
  credentials: EntrezCredentials,
): SetupStatus {
  return {
    configured: config !== null,
    tool: config?.tool,
    email: config?.email,
    default_db: config?.default_db,
    base_url: config?.base_url,
    output_path: config?.output_path,
    date_tag: config?.date_tag,
    default_date_range: config?.default_date_range,
    api_key: maskApiKey(credentials.api_key),
    rateLimit: resolveRateLimit(credentials).limit,
  };
}
