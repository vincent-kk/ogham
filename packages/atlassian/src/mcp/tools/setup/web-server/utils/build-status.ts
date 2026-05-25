import type {
  AtlassianConfig,
  SetupStatus,
} from "../../../../../types/index.js";

export function buildStatus(config: AtlassianConfig): SetupStatus {
  return {
    configured: !!(config.jira?.length || config.confluence?.length),
    jira: config.jira?.map((s) => ({
      base_url: s.base_url,
      is_cloud: s.is_cloud,
    })),
    confluence: config.confluence?.map((s) => ({
      base_url: s.base_url,
      is_cloud: s.is_cloud,
    })),
  };
}
