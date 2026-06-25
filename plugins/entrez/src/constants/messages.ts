/**
 * @file messages.ts
 * @description User-facing and error message strings. Inline message literals
 * are forbidden elsewhere — import from here.
 */

export const Messages = {
  NOT_CONFIGURED:
    "entrez is not configured. Run the `setup` skill to set tool/email (and optional api_key).",
  TOOL_EMAIL_MISSING:
    "NCBI requires both `tool` and `email`. Configure them via the setup skill.",
  SSRF_PATH_TRAVERSAL: "SSRF: path traversal detected in URL.",
  SSRF_INVALID_PROTOCOL: "SSRF: invalid protocol. Only http/https allowed.",
  SSRF_HOST_NOT_ALLOWED:
    "SSRF: host is not in the NCBI E-utilities allowlist.",
  SSRF_PRIVATE_IP: "SSRF: access to private/reserved IP is blocked.",
  RATE_RETRY_EXCEEDED:
    "NCBI rate limit retries exhausted. Try off-peak hours (US Eastern 21:00–05:00 or weekends).",
  CAP_EXCEEDED:
    "ESearch Count exceeds the 10,000 UID cap and CapStrategy=ABORT was set.",
  SEGMENT_DEPTH_EXCEEDED:
    "Date segmentation exceeded the maximum recursion depth; a bucket is still over the 10k cap.",
  BUDGET_EXCEEDED: "Operation budget exhausted before completion.",
  WEBENV_EXPIRED:
    "History WebEnv appears expired (~1h TTL). Falling back to PMID snapshot.",
  JOB_NOT_FOUND: "No async search job found for the given jobId.",
  LICENSE_UNVERIFIED:
    "Open-access license could not be verified; download withheld. Link reported instead.",
  PATH_ESCAPE: "Refused: download path escapes the declared output directory.",
  NETWORK_ERROR: "Network error while contacting NCBI E-utilities.",
  PARSE_ERROR: "Failed to parse the NCBI E-utilities response.",
  EINFO_UNREACHABLE: "EInfo probe failed — base URL unreachable or rejected.",
} as const;
export type MessageKey = keyof typeof Messages;
