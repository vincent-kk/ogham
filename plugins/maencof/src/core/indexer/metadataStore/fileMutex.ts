/**
 * @file fileMutex.ts
 * @description Per-vault in-process mutex via Promise chain (zero deps).
 */

const lockChains = new Map<string, Promise<unknown>>();

/**
 * `vaultPath`별로 `fn` 실행을 직렬화한다 (in-process).
 *
 * - 동일 vaultPath 호출은 Promise chain으로 순차 실행.
 * - 다중 프로세스 안전성은 atomic-write의 rename 원자성에 의존.
 */
export async function withVaultLock<T>(
  vaultPath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = lockChains.get(vaultPath) ?? Promise.resolve();
  const current: Promise<T> = previous.catch(() => undefined).then(() => fn());
  const tracker: Promise<void> = current.then(
    () => undefined,
    () => undefined,
  );
  lockChains.set(vaultPath, tracker);
  try {
    return await current;
  } finally {
    if (lockChains.get(vaultPath) === tracker) lockChains.delete(vaultPath);
  }
}
