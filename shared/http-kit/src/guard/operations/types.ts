/** Raw request facts a caller extracts from `IncomingMessage` for inspection. */
export interface GuardOptions {
  /** `req.headers.host` — checked against the loopback allowlist. */
  host: string | undefined;
  /** `req.method` — the Origin/Content-Type checks apply to `POST` only. */
  method: string;
  /** `req.headers.origin` — verified on state-changing requests when present. */
  origin?: string | undefined;
  /** `req.headers["content-type"]` — CSRF media-type check on `POST`. */
  contentType?: string | undefined;
  /** Server session token; when set, the provided token must match it. */
  expectedToken?: string;
  /** Token supplied by the client (query `?token=` or a request header). */
  providedToken?: string;
  /** Content-Type prefixes accepted on `POST`. Default: `application/json`. */
  allowedContentTypes?: readonly string[];
}

/** Machine-readable reason a request was rejected. */
export type GuardRejectionCode =
  | "invalid_host"
  | "invalid_token"
  | "invalid_origin"
  | "unsupported_media_type";

/** Outcome of {@link inspectRequest}: allow, or reject with a status to send. */
export type GuardVerdict =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: GuardRejectionCode;
      message: string;
    };
