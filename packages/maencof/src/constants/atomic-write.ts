/** Atomic write 의 retry 정책 — temp + rename 실패 시 재시도 횟수와 backoff 간격. */
export const ATOMIC_WRITE_RETRY_ATTEMPTS = 3;
export const ATOMIC_WRITE_RETRY_BACKOFF_MS = 50;
