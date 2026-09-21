/** A unit whose related unknown files are wanted. */
export interface RelevanceTarget {
  /** Project-relative POSIX path. */
  path: string;
  /**
   * `file`: a plain file, named by its stem.
   * `module-index`: the file the adapter reports as its directory's module
   * entry, named by that directory; the directory's subtree is related.
   * `directory`: named by itself; its subtree is related.
   */
  kind: 'file' | 'module-index' | 'directory';
}
