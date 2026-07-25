import { verifyToken } from "../token/verifyToken.js";

import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from "./patterns.js";
import type { GuardOptions, GuardVerdict } from "./types.js";

const DEFAULT_ALLOWED_CONTENT_TYPES = ["application/json"] as const;

/**
 * Decide whether a local HTTP request may proceed. Pure: it never touches the
 * response — the caller maps a rejecting verdict onto its own envelope. Order
 * (loopback host → token → POST origin → POST content-type) is the deilen
 * canon; the host and origin checks block DNS rebinding even if a token leaks.
 */
export function inspectRequest(options: GuardOptions): GuardVerdict {
  if (!LOOPBACK_HOST.test(options.host ?? ""))
    return {
      ok: false,
      status: 403,
      code: "invalid_host",
      message: "Invalid host",
    };

  if (
    options.expectedToken !== undefined &&
    !verifyToken(options.expectedToken, options.providedToken ?? "")
  )
    return {
      ok: false,
      status: 401,
      code: "invalid_token",
      message: "Invalid token",
    };

  if (options.method === "POST") {
    const { origin } = options;
    if (origin !== undefined && !LOOPBACK_ORIGIN.test(origin))
      return {
        ok: false,
        status: 403,
        code: "invalid_origin",
        message: "Invalid origin",
      };

    const allowed =
      options.allowedContentTypes ?? DEFAULT_ALLOWED_CONTENT_TYPES;
    const contentType = (options.contentType ?? "").toLowerCase();
    if (!allowed.some((type) => contentType.startsWith(type)))
      return {
        ok: false,
        status: 415,
        code: "unsupported_media_type",
        message: "Unsupported Content-Type",
      };
  }

  return { ok: true };
}
