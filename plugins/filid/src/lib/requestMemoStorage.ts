/**
 * @file requestMemoStorage.ts
 * @description The async-context store `runWithRequestMemo` opens and
 * `memoizeWithinRequest` reads.
 *
 * A module-global map is forbidden here: one server process serves many tool
 * calls and the project tree moves between them, so a memo that outlived its
 * scope would answer the next call from a tree that no longer exists. The
 * store lives on the async context of one open scope and nowhere else, which
 * also keeps concurrent scopes from seeing each other's entries.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Memoized values of one scope: caller-owned namespace, then key, then the
 * value as its producer returned it.
 */
export type RequestMemoStore = Map<string, Map<string, unknown>>;

/** Carries the store of the innermost open request-memo scope. */
export const requestMemoStorage = new AsyncLocalStorage<RequestMemoStore>();
