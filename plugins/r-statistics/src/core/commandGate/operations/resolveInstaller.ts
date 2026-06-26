import { INSTALLER_COMMANDS } from "../../../constants/defaults.js";
import { INSTALLER_NOT_AVAILABLE } from "../../../constants/messages.js";

export interface InstallerCommand {
  command: string;
  args: string[];
}

/**
 * Map an OS package manager to its single approved R-install invocation. Used by
 * the r-setup consent gate — installation is a separate channel from run-r and
 * must be user-approved (irreversible system change).
 */
export function resolveInstaller(manager: string): InstallerCommand {
  const entry = INSTALLER_COMMANDS[manager];
  if (!entry) throw new Error(INSTALLER_NOT_AVAILABLE(manager));
  return { command: entry.command, args: [...entry.args] };
}
