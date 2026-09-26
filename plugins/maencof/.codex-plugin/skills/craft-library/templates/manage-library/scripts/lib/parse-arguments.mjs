const VALUE_FLAGS = new Set([
  'article',
  'created-at',
  'name',
  'search-term',
  'source',
  'tag',
  'to',
  'vault',
]);
const BOOLEAN_FLAGS = new Set(['clear-search-terms', 'clear-tags', 'yes']);
const REPEATABLE_FLAGS = new Set(['search-term', 'tag']);

/**
 * Parse manager flags without reading ambient configuration.
 * @param {string[]} argv command arguments after the operation name
 * @returns {Record<string, string | string[] | boolean>} normalized options
 */
export function parseArguments(argv) {
  const options = { tag: [], 'search-term': [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--'))
      throw new Error(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    if (BOOLEAN_FLAGS.has(name)) {
      options[name] = true;
      continue;
    }
    if (!VALUE_FLAGS.has(name)) throw new Error(`Unknown option: --${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value: --${name}`);
    index += 1;
    if (REPEATABLE_FLAGS.has(name)) options[name].push(value);
    else if (options[name] !== undefined)
      throw new Error(`Duplicate option: --${name}`);
    else options[name] = value;
  }
  return options;
}
