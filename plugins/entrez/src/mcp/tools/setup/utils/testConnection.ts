import { EutilFn, RetMode, RateLimit } from "../../../../types/enums.js";
import type { HttpDeps } from "../../../../types/http.js";
import type {
  SetupFormData,
  ConnectionTestResult,
} from "../../../../types/setup.js";
import { httpRequest } from "../../../../core/httpClient/index.js";
import { buildBaseUrl } from "../../../../core/sourceResolver/index.js";
import { extractHost } from "../../../../utils/url.js";
import {
  DEFAULT_EUTILS_BASE,
  NCBI_SERVICE_HOST,
  ENTREZ_TOOL_NAME,
} from "../../../../constants/defaults.js";
import { Messages } from "../../../../constants/messages.js";

export interface TestConnectionOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Probe EInfo reachability with the form-provided identity (api_key already
 * un-masked by the handler). Returns success + the rate the key would grant —
 * does not persist anything.
 */
export async function testConnection(
  data: SetupFormData,
  options: TestConnectionOptions = {},
): Promise<ConnectionTestResult> {
  const baseUrl = data.base_url ?? DEFAULT_EUTILS_BASE;
  const deps: HttpDeps = {
    tool: ENTREZ_TOOL_NAME,
    email: data.email,
    apiKey: data.api_key || undefined,
    allowedHosts: [extractHost(baseUrl), NCBI_SERVICE_HOST],
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
  };

  try {
    const res = await httpRequest(
      {
        url: buildBaseUrl(EutilFn.EINFO, baseUrl),
        params: { retmode: RetMode.JSON },
      },
      deps,
    );
    if (res.ok && res.text !== undefined) {
      let dbCount: number | undefined;
      try {
        const dbs = (
          JSON.parse(res.text) as { einforesult?: { dblist?: string[] } }
        ).einforesult?.dblist;
        dbCount = dbs?.length;
      } catch {
        dbCount = undefined;
      }
      return {
        success: true,
        message: "EInfo reachable",
        rateLimit: data.api_key ? RateLimit.WITH_KEY : RateLimit.NO_KEY,
        dbCount,
      };
    }
    return {
      success: false,
      message: res.error?.message ?? Messages.EINFO_UNREACHABLE,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : Messages.EINFO_UNREACHABLE,
    };
  }
}
