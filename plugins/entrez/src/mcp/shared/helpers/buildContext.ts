import type { Db } from "../../../types/enums.js";
import type { EntrezConfig, EntrezCredentials } from "../../../types/config.js";
import type { HttpDeps } from "../../../types/http.js";
import { loadConfig, loadCredentials } from "../../../core/config/index.js";
import { extractHost } from "../../../utils/url.js";
import { NCBI_SERVICE_HOST } from "../../../constants/defaults.js";
import { Messages } from "../../../constants/messages.js";

/** Resolved per-request context shared by read tools. */
export interface ToolContext {
  config: EntrezConfig;
  credentials: EntrezCredentials;
  deps: HttpDeps;
  baseUrl: string;
  db: Db;
  /** Injectable clock (ms) for deterministic manifests/tests. */
  nowMs?: number;
  /** Override the SearchManifest directory (tests); defaults to the cache. */
  manifestDir?: string;
}

export interface BuildContextOptions {
  configPath?: string;
  credentialsPath?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

/**
 * Load config + credentials and assemble the HTTP deps (DI). Throws
 * NOT_CONFIGURED when config is absent. The SSRF allowlist is derived from the
 * configured base URL host plus the PMC utils host (idconv/oa.fcgi); api_key is
 * injected into deps but never surfaced.
 */
export async function buildToolContext(
  options: BuildContextOptions = {},
): Promise<ToolContext> {
  const config = await loadConfig(options.configPath);
  if (!config) throw new Error(Messages.NOT_CONFIGURED);
  const credentials = await loadCredentials(options.credentialsPath);

  const deps: HttpDeps = {
    tool: config.tool,
    email: config.email,
    apiKey: credentials.api_key,
    allowedHosts: [extractHost(config.base_url), NCBI_SERVICE_HOST],
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
    signal: options.signal,
  };

  return { config, credentials, deps, baseUrl: config.base_url, db: config.default_db };
}
