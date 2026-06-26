import type { Db, RateLimit } from "../../../../../types/enums.js";
import type {
  EntrezConfig,
  EntrezCredentials,
} from "../../../../../types/config.js";
import { resolveRateLimit } from "../../../../../core/config/index.js";
import { maskApiKey } from "./maskApiKey.js";
import { buildPathSuggestions } from "./buildPathSuggestions.js";

export interface SetupStatus {
  configured: boolean;
  email?: string;
  default_db?: Db;
  base_url?: string;
  output_path?: string;
  date_tag?: boolean;
  /** Relative search window in days (undefined = no limit). */
  default_window_days?: number;
  /** Cross-platform download-directory autocomplete suggestions. */
  path_suggestions: string[];
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
    email: config?.email,
    default_db: config?.default_db,
    base_url: config?.base_url,
    output_path: config?.output_path,
    date_tag: config?.date_tag,
    default_window_days: config?.default_window_days,
    path_suggestions: buildPathSuggestions(),
    api_key: maskApiKey(credentials.api_key),
    rateLimit: resolveRateLimit(credentials).limit,
  };
}
