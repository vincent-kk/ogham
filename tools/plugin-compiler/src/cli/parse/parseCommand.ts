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
    pluginDirectories: rest
      .filter((argument) => argument !== CHECK_FLAG)
      .map((argument) => resolve(argument)),
  };
}
