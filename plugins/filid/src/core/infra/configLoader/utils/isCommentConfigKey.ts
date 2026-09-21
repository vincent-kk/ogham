/**
 * Whether a config key is an annotation the loader drops without a warning.
 * @param key Object key or array index from a config path.
 * @returns True for `$schema`, `$comment` and any key starting with `_`.
 */
export function isCommentConfigKey(key: string | number): boolean {
  return (
    typeof key === 'string' &&
    (key === '$schema' || key === '$comment' || key.startsWith('_'))
  );
}
