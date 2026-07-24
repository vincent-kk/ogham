import { resolve } from "node:path";

const CHECK_FLAG = "--check";

export interface SyncCommand {
  check: boolean;
  pluginDirectories: string[];
}

export function parseCommand(argumentList: string[]): SyncCommand | null {
  const [command, ...rest] = argumentList;
  if (command !== "sync") return null;
  return {
    check: rest.includes(CHECK_FLAG),
    // resolve() only — deliberately no existence/manifest check here (a typo'd
    // flag like "--chek" also lands in this list as a bogus path). Validated
    // downstream by planPluginAdapters.ts, which emits a formatted Diagnostic
    // instead of letting a raw ENOENT crash the CLI.
    pluginDirectories: rest
      .filter((argument) => argument !== CHECK_FLAG)
      .map((argument) => resolve(argument)),
  };
}
