const RETRY_MARKER = /Retrying after/gi;

export function createRetryStormDetector(
  maxRetries = 2,
): (chunk: string, accumulated: string) => boolean {
  return (_chunk, accumulated) =>
    (accumulated.match(RETRY_MARKER)?.length ?? 0) >= maxRetries;
}
