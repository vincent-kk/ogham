import { requestMemoStorage } from './requestMemoStorage.js';

/**
 * Run `work` with a request-scoped memo available to everything it calls.
 *
 * Open one scope per unit of work whose inputs cannot move while it runs — a
 * single tool snapshot, never a whole session: `memoizeWithinRequest` answers
 * from the store for as long as the scope is open, so a scope spanning a write
 * into the scanned tree would serve the pre-write answer afterwards. A nested
 * call reuses the scope already open rather than shadowing it, so one unit of
 * work keeps one store however deep the call chain goes.
 * @param work Runs inside the scope. Its result is returned as given, so an async `work` holds the store for the whole promise it returns.
 * @returns Whatever `work` returns.
 */
export function runWithRequestMemo<T>(work: () => T): T {
  if (requestMemoStorage.getStore()) return work();
  return requestMemoStorage.run(new Map(), work);
}
