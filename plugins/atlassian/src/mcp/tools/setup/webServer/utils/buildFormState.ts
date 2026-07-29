import type {
  AtlassianConfig,
  Credentials,
} from "../../../../../types/index.js";

import { buildEditableSitesState } from "./buildEditableSitesState.js";
import { buildStatus } from "./buildStatus.js";

/**
 * Everything the settings form prefills from, for one config document.
 *
 * Built per layer so the scope toggle can re-seat the form without a round
 * trip. The scope state itself is not part of it: which layer is chosen is a
 * question about the page, not about a config document.
 *
 * @param config The layer's config; an empty one yields an unconfigured form.
 * @param credentials Account secrets, which are not layered — the same ones
 *   apply to whichever layer is shown, and only their presence is reported.
 * @returns The prefill view, with site entries only for services that exist.
 */
export function buildFormState(
  config: AtlassianConfig,
  credentials: Credentials,
): Record<string, unknown> {
  const jiraSites = config.jira ?? [];
  const confSites = config.confluence ?? [];
  const hasOnPremSite =
    jiraSites.some((site) => !site.is_cloud) ||
    confSites.some((site) => !site.is_cloud);

  return {
    ...buildStatus(config),
    ...(jiraSites.length > 0
      ? { jira: buildEditableSitesState(jiraSites, credentials.jira) }
      : {}),
    ...(confSites.length > 0
      ? {
          confluence: buildEditableSitesState(
            confSites,
            credentials.confluence,
          ),
        }
      : {}),
    deployment_type: hasOnPremSite ? "onprem" : "cloud",
  };
}
