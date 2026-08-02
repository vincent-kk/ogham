/**
 * Greets a person by name.
 * @param {string[]} args - args[0] is the name; defaults to "world".
 * @returns {string} greeting line
 */
export function run(args) {
  return `hello ${args[0] ?? 'world'}`;
}
