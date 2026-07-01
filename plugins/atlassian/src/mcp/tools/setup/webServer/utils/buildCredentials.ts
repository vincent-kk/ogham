import type {
  SetupFormData,
  ServiceCredentials,
} from "../../../../../types/index.js";

export function buildCredentials(
  svc: SetupFormData["jira"],
  username?: string,
): ServiceCredentials {
  if (!svc) return {};
  if (!username && svc.api_token) return { bearer: { token: svc.api_token } };

  if (username && (svc.api_token || svc.password))
    return { basic: { api_token: svc.api_token, password: svc.password } };

  return {};
}
