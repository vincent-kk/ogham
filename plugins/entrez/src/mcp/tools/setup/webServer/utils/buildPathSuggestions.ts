import { homedir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_OUTPUT_DIR,
  OUTPUT_PATH_SUGGESTION_DIRS,
} from "../../../../../constants/defaults.js";

/**
 * Cross-platform download-directory suggestions for the settings form's
 * autocomplete: the plugin's default cache dir plus common user folders joined
 * with the current OS home dir, so paths render natively on macOS (`/Users/…`)
 * and Windows (`C:\Users\…`). The browser cannot read the filesystem, so the
 * server supplies these — there is no directory-picker that yields a real path.
 */
export function buildPathSuggestions(): string[] {
  const home = homedir();
  return [
    DEFAULT_OUTPUT_DIR,
    ...OUTPUT_PATH_SUGGESTION_DIRS.map((dir) => join(home, dir)),
  ];
}
