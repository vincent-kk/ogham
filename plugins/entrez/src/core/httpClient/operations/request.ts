import { HttpMethod, ErrorCode } from "../../../types/enums.js";
import type { HttpRequest, HttpDeps, HttpResponse } from "../../../types/http.js";
import {
  DEFAULT_TIMEOUT_MS,
  RETRY_MAX_RETRIES,
  RATE_RETRY_MAX,
  RETRYABLE_STATUS_CODES,
  TOO_MANY_REQUESTS,
} from "../../../constants/defaults.js";
import { validateUrl } from "./ssrfGuard.js";
import { decideMethod } from "./autoPost.js";
import { parseRetryAfterMs } from "./backoff429.js";
import { withRetry, type AttemptOutcome } from "./withRetry.js";

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

/** Merge request params with injected NCBI identity (tool/email/api_key). */
function buildParams(req: HttpRequest, deps: HttpDeps): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.params ?? {})) {
    if (value !== undefined) merged[key] = String(value);
  }
  if (req.injectAuth ?? true) {
    merged.tool = deps.tool;
    merged.email = deps.email;
    if (deps.apiKey) merged.api_key = deps.apiKey;
  }
  return merged;
}

function buildGetUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function mapStatusToCode(status: number): ErrorCode {
  if (status === 404) return ErrorCode.NOT_FOUND;
  if (status === 400) return ErrorCode.INVALID_QUERY;
  return ErrorCode.EUTILS_ERROR;
}

function resolveSignal(deps: HttpDeps, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return deps.signal ? AbortSignal.any([deps.signal, timeout]) : timeout;
}

async function classify(
  res: Response,
  acceptBinary: boolean,
): Promise<AttemptOutcome> {
  const status = res.status;
  const contentType = res.headers.get("content-type") ?? undefined;

  if (status >= 200 && status < 300) {
    if (acceptBinary) {
      return { kind: "success", status, binary: await res.arrayBuffer(), contentType };
    }
    return { kind: "success", status, text: await res.text(), contentType };
  }

  if (status === TOO_MANY_REQUESTS) {
    return {
      kind: "retry",
      status,
      isRateLimit: true,
      retryAfterMs: parseRetryAfterMs(res.headers.get("retry-after")),
      code: ErrorCode.RATE_LIMITED,
      message: `HTTP ${status}`,
    };
  }

  if ((RETRYABLE_STATUS_CODES as readonly number[]).includes(status)) {
    return {
      kind: "retry",
      status,
      isRateLimit: false,
      code: ErrorCode.EUTILS_ERROR,
      message: `HTTP ${status}`,
    };
  }

  return { kind: "fatal", status, code: mapStatusToCode(status), message: `HTTP ${status}` };
}

/**
 * Execute an NCBI request: inject identity, choose GET/POST (auto-POST),
 * SSRF-validate, then run through the retry loop. The single network choke
 * point — all eutils/idconv/oa traffic flows through here.
 */
export async function httpRequest(
  req: HttpRequest,
  deps: HttpDeps,
): Promise<HttpResponse> {
  const apiKeyUsed = (req.injectAuth ?? true) && Boolean(deps.apiKey);
  const params = buildParams(req, deps);
  const getUrl = buildGetUrl(req.url, params);
  const method = req.method ?? decideMethod(params, getUrl.length);

  const isPost = method === HttpMethod.POST;
  const finalUrl = isPost ? req.url : getUrl;
  const body = isPost ? new URLSearchParams(params).toString() : undefined;

  await validateUrl(finalUrl, deps.allowedHosts, deps.allowPrivateIp);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const acceptBinary = req.acceptBinary ?? false;

  const headers: Record<string, string> = {
    Accept: acceptBinary ? "*/*" : "application/xml, application/json, text/plain",
  };
  if (isPost) headers["Content-Type"] = FORM_CONTENT_TYPE;

  const outcome = await withRetry(
    async () => {
      try {
        const res = await fetchImpl(finalUrl, {
          method,
          headers,
          body,
          redirect: "error",
          signal: resolveSignal(deps, timeoutMs),
        });
        return classify(res, acceptBinary);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          kind: "retry" as const,
          status: 0,
          isRateLimit: false,
          code: ErrorCode.NETWORK_ERROR,
          message,
        };
      }
    },
    { maxRetries: deps.maxRetries ?? RETRY_MAX_RETRIES, rateRetryMax: deps.rateRetryMax ?? RATE_RETRY_MAX, sleep },
  );

  if (outcome.kind === "success") {
    return {
      ok: true,
      status: outcome.status,
      method,
      text: outcome.text,
      binary: outcome.binary,
      contentType: outcome.contentType,
      apiKeyUsed,
    };
  }

  return {
    ok: false,
    status: outcome.status,
    method,
    error: { code: outcome.code, message: outcome.message, retryable: false },
    apiKeyUsed,
  };
}
