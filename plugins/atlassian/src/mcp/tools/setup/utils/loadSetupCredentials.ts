import {
  loadCredentials,
  InvalidCredentialsError,
} from "../../../../core/authManager/index.js";
import type { Credentials } from "../../../../types/index.js";

/**
 * Load credentials for setup, allowing schema-invalid storage to be replaced.
 * @returns Valid credentials or an empty object for missing/schema-invalid storage.
 * @throws Other storage failures so an unreadable file is not silently treated as empty.
 */
export async function loadSetupCredentials(): Promise<Credentials> {
  try {
    return await loadCredentials();
  } catch (error) {
    if (error instanceof InvalidCredentialsError) return {};
    throw error;
  }
}
