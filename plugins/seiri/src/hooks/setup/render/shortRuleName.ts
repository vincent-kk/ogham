import { RULE_ID_PREFIX } from '../../../constants/plugin.js';

/**
 * `seiri_agent-legible` reads as `agent-legible` once the source is known.
 * @param id Manifest rule id.
 * @returns The id with the plugin's rule-id prefix stripped, when present.
 */
export function shortRuleName(id: string): string {
  return id.startsWith(RULE_ID_PREFIX) ? id.slice(RULE_ID_PREFIX.length) : id;
}
