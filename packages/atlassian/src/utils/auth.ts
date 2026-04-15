import type {
  ServiceCredentials,
  TokenPayload,
} from "../types/index.js";

/** Build a Basic Authorization header from service credentials */
export function buildAuthHeader(
  serviceCredentials: ServiceCredentials,
  username?: string,
): TokenPayload | null {
  const basic = serviceCredentials.basic;
  if (!basic || !username) return null;
  const token = basic.api_token ?? basic.password;
  if (!token) return null;
  const encoded = Buffer.from(`${username}:${token}`).toString("base64");
  return { type: "basic", value: `Basic ${encoded}` };
}
