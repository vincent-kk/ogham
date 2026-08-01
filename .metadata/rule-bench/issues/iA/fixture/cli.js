// Command registry: files in commands/ are auto-discovered; the filename
// (minus .js) is the command name. Run as `node cli.js <command> [args...]`.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Resolves and runs a command by name.
 * @param {string} name - command name; must match a file in commands/.
 * @param {string[]} args - arguments forwarded to the command.
 * @returns {Promise<string>} the command's output line
 */
export async function dispatch(name, args = []) {
  const available = readdirSync(new URL('./commands/', import.meta.url))
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.slice(0, -3));
  if (!available.includes(name)) throw new Error(`unknown command: ${name}`);
  const mod = await import(`./commands/${name}.js`);
  return mod.run(args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(await dispatch(process.argv[2], process.argv.slice(3)));
