import type {
  AuthType,
  ServiceCredentials,
  TokenPayload,
} from "../types/index.js";

/** Build an Authorization header value for the given service and auth type */
export function buildAuthHeader(
  authType: AuthType,
  serviceCredentials: ServiceCredentials,
  username?: string,
): TokenPayload | null {
  switch (authType) {
    case "basic": {
      const basic = serviceCredentials.basic;
      if (!basic || !username) return null;
      const token = basic.api_token ?? basic.password;
      if (!token) return null;
      const encoded = Buffer.from(`${username}:${token}`).toString("base64");
      return { type: "basic", value: `Basic ${encoded}` };
    }
    case "pat": {
      const pat = serviceCredentials.pat;
      if (!pat) return null;
      return { type: "bearer", value: `Bearer ${pat.personal_token}` };
    }
    case "oauth": {
      const oauth = serviceCredentials.oauth;
      if (!oauth) return null;
      return { type: "bearer", value: `Bearer ${oauth.access_token}` };
    }
  }
}
