import { INSTALLER_COMMANDS } from "../../../constants/defaults.js";

const APPROVED_BINARIES = new Set(
  Object.values(INSTALLER_COMMANDS).map((entry) => entry.command),
);

/**
 * Whitelist check: is the base command one of the approved package-manager
 * installers? Anything else is rejected (COMMAND_BLOCKED).
 */
export function validateCommand(command: string): boolean {
  return APPROVED_BINARIES.has(command);
}
