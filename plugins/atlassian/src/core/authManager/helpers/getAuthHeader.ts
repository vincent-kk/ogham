import { buildAuthHeader } from "../../../utils/index.js";
import { loadCredentials } from "./loadCredentials.js";

/**
 * Assemble an authentication header only from validated stored credentials.
 * @param service Atlassian service whose stored credentials are selected.
 * @param username Optional account name used for Basic authentication.
 * @param credentialsPath Optional storage override; omitted uses the host-resolved path.
 * @returns The header or null for absent credentials; validation and storage failures propagate.
 */
export async function getAuthHeader(
  service: "jira" | "confluence",
  username?: string,
  credentialsPath?: string,
): Promise<string | null> {
  const credentials = await loadCredentials(credentialsPath);
  const serviceCredentials = credentials[service];
  if (!serviceCredentials) return null;
  const payload = buildAuthHeader(serviceCredentials, username);
  return payload?.value ?? null;
}
