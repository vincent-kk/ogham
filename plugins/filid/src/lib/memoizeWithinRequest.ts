/**
 * @file memoizeWithinRequest.ts
 * @description Reads the request-scoped memo `runWithRequestMemo` opens.
 *
 * The store is ambient rather than a parameter because its readers sit behind
 * adapter interfaces the entry point cannot thread a cache through, and
 * because a scope must cover a whole call tree to be worth anything.
 * `runWithRequestMemo` is the single place the lifetime is decided.
 */
import { requestMemoStorage } from './requestMemoStorage.js';

/**
 * Answer from the open request-memo scope, running `compute` once per key.
 *
 * With no scope open nothing is stored and `compute` runs on every call, so a
 * caller outside a scope behaves exactly as it would without this module. A
 * `compute` that throws is not recorded and the next call retries it. The
 * value is stored as produced, so a caller whose value is mutable hands back a
 * copy — a consumer that sorts or filters the result in place would otherwise
 * poison every later answer.
 * @param namespace Caller-owned group, so two callers cannot collide on one key.
 * @param key Identity of the computation inside the namespace; everything that changes the result belongs in it, or the memo answers the wrong question.
 * @param compute Produces the value for an unseen key.
 * @returns The value stored for `key`, or `compute()` when no scope is open.
 * @throws Whatever `compute` throws, uncached.
 */
export function memoizeWithinRequest<T>(
  namespace: string,
  key: string,
  compute: () => T,
): T {
  const store = requestMemoStorage.getStore();
  if (!store) return compute();
  let entries = store.get(namespace);
  if (!entries) {
    entries = new Map<string, unknown>();
    store.set(namespace, entries);
  }
  // The store is heterogeneous by design, so the caller's `T` is the only
  // record of what a namespace holds.
  if (entries.has(key)) return entries.get(key) as T;
  const value = compute();
  entries.set(key, value);
  return value;
}
