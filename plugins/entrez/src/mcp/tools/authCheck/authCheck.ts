import { EutilFn, RetMode } from "../../../types/enums.js";
import type { HttpDeps } from "../../../types/http.js";
import type { AuthCheckInput, AuthCheckOutput } from "../../../types/tool.js";
import {
  loadConfig,
  loadCredentials,
  resolveRateLimit,
} from "../../../core/config/index.js";
import { buildBaseUrl } from "../../../core/sourceResolver/index.js";
import { httpRequest } from "../../../core/httpClient/index.js";
import { extractHost } from "../../../utils/url.js";
import { NCBI_SERVICE_HOST } from "../../../constants/defaults.js";

export interface AuthCheckOptions {
  configPath?: string;
  credentialsPath?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/** Extract the db list from an EInfo JSON response. */
function parseEInfoDbs(jsonText: string): string[] | undefined {
  try {
    const parsed = JSON.parse(jsonText) as {
      einforesult?: { dblist?: string[] };
    };
    return parsed.einforesult?.dblist;
  } catch {
    return undefined;
  }
}

/**
 * auth-check — report configuration state, EInfo reachability, and the
 * effective rate limit. Works when unconfigured (configured:false). Never
 * exposes the api_key value — only its presence.
 */
export async function runAuthCheck(
  input: AuthCheckInput = {},
  options: AuthCheckOptions = {},
): Promise<AuthCheckOutput> {
  const config = await loadConfig(options.configPath);
  const credentials = await loadCredentials(options.credentialsPath);

  const configured = config !== null;
  const toolEmailConfigured = Boolean(config?.tool && config?.email);
  const { limit } = resolveRateLimit(credentials);
  const hasApiKey = Boolean(credentials.api_key);

  let reachable = false;
  let dbList: string[] | undefined;

  if ((input.probeEInfo ?? true) && config) {
    const deps: HttpDeps = {
      tool: config.tool,
      email: config.email,
      apiKey: credentials.api_key,
      allowedHosts: [extractHost(config.base_url), NCBI_SERVICE_HOST],
      fetchImpl: options.fetchImpl,
      sleep: options.sleep,
    };
    try {
      const res = await httpRequest(
        { url: buildBaseUrl(EutilFn.EINFO, config.base_url), params: { retmode: RetMode.JSON } },
        deps,
      );
      if (res.ok && res.text !== undefined) {
        reachable = true;
        dbList = parseEInfoDbs(res.text);
      }
    } catch {
      reachable = false;
    }
  }

  return { configured, reachable, hasApiKey, rateLimit: limit, toolEmailConfigured, dbList };
}
