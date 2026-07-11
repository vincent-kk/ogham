import type { TokenResolver } from "../../tokens/substituteTokens.js";
import type { PluginIR } from "../../types/ir.js";
import type { HostProfile } from "../../types/profile.js";

/** Build the token resolver for a host from its profile — shared by skill and agent emit. */
export function resolverFor(ir: PluginIR, profile: HostProfile): TokenResolver {
  return {
    tool: (logical) => profile.toolRef(ir, logical),
    skill: (name) => profile.skillRef(ir, name),
    pluginRoot: () => {
      if (profile.pluginRoot === null)
        throw new Error(
          `host '${profile.id}' forbids {{pluginRoot}} in bodies`,
        );
      return profile.pluginRoot;
    },
  };
}
