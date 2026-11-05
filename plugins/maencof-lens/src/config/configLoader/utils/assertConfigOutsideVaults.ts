import { isAbsolute, relative, resolve, sep } from "node:path";

import { canonicalizeTargetPathSync } from "@ogham/cross-platform";

import {
  isValidLensConfig,
  normalizeLensConfig,
} from "../../configSchema/guard/configGuard.js";

/**
 * Refuse a config destination beneath any registered vault without writing files.
 * @param projectRoot Host workspace anchoring the config destination.
 * @param targetPath Explicitly selected layer destination, including missing suffixes.
 * @param configs Existing layer documents and the proposed document to inspect.
 * @param vaultPathBase Process working folder used by readers for relative vault paths.
 * @returns Nothing when both the lexical and physical destination are outside all vaults.
 * @throws Error with relocation guidance when a vault contains the destination.
 */
export function assertConfigOutsideVaults(
  projectRoot: string,
  targetPath: string,
  configs: readonly unknown[],
  vaultPathBase: string,
): void {
  const targets = [
    resolve(projectRoot, targetPath),
    canonicalizeTargetPathSync(projectRoot, targetPath),
  ];
  for (const config of configs) {
    if (!isValidLensConfig(config)) continue;
    for (const vault of normalizeLensConfig(config).vaults) {
      const roots = [
        resolve(vaultPathBase, vault.path),
        canonicalizeTargetPathSync(vaultPathBase, vault.path),
      ];
      if (
        roots.some((root) => targets.some((target) => isWithin(root, target)))
      )
        throw new Error(
          "Cannot save lens settings inside a registered vault. Set MAENCOF_LENS_CONFIG_ROOT to a folder outside the vault, or save to the user layer.",
        );
    }
  }
}

/**
 * Compare complete path components rather than shared string prefixes.
 * @param root Absolute vault root in the same representation as the target.
 * @param target Absolute config destination to compare.
 * @returns Whether the target equals the root or is its descendant.
 */
function isWithin(root: string, target: string): boolean {
  const difference = relative(root, target);
  return (
    difference === "" ||
    (difference !== ".." &&
      !difference.startsWith(`..${sep}`) &&
      !isAbsolute(difference))
  );
}
