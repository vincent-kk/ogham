import type { ServiceCredentials, TokenPayload } from "../types/index.js";

/** Build an Authorization header from service credentials.
 *
 * Branching by credential slot (not by username presence):
 * - basic slot + username + token → Basic base64(user:token)
 * - bearer slot + token → Bearer token (on-prem PAT, username not required)
 * - else null
 */
export function buildAuthHeader(
  serviceCredentials: ServiceCredentials,
  username?: string,
): TokenPayload | null {
  const basic = serviceCredentials.basic;
  if (basic && username) {
    const token = basic.api_token ?? basic.password;
    if (token) {
      const encoded = Buffer.from(`${username}:${token}`).toString("base64");
      return { type: "basic", value: `Basic ${encoded}` };
    }
  }
  const bearer = serviceCredentials.bearer;
  if (bearer?.token) {
    return { type: "bearer", value: `Bearer ${bearer.token}` };
  }
  return null;
}
