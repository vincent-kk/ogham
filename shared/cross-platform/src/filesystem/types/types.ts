export interface EnsureDirectoryOptions {
  readonly mode?: number;
}

export interface AtomicWriteOptions {
  readonly fileMode?: number;
  readonly directoryMode?: number;
}

export interface FileLockOptions {
  readonly timeoutMs?: number;
  readonly staleMs?: number;
}

export type FileLockResult<T> =
  | { readonly acquired: true; readonly value: T }
  | { readonly acquired: false };
