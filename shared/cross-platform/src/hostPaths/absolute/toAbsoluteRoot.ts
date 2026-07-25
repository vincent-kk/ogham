import { portableIsAbsolute } from "../../paths/compat/operations/portableIsAbsolute.js";
import { portableResolve } from "../../paths/compat/portableResolve.js";
import { expandAbsoluteRootHome } from "./expandAbsoluteRootHome.js";

export function toAbsoluteRoot(value: string): string | null {
  const expanded = expandAbsoluteRootHome(value);
  if (expanded === null) return null;
  return portableIsAbsolute(expanded) ? portableResolve(expanded) : null;
}
