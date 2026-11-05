import { beforeEach, expect, it, vi } from "vitest";
import {
  loadCredentials,
  InvalidCredentialsError,
} from "../../../../../core/authManager/index.js";
import { loadSetupCredentials } from "../loadSetupCredentials.js";

vi.mock("../../../../../core/authManager/index.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../core/authManager/index.js")
  >()),
  loadCredentials: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

it("recovers only stored-schema validation failures as empty credentials", async () => {
  vi.mocked(loadCredentials).mockRejectedValue(new InvalidCredentialsError());
  await expect(loadSetupCredentials()).resolves.toEqual({});
});

it("propagates other read failures instead of masking them as an empty file", async () => {
  const error = new Error("permission denied");
  vi.mocked(loadCredentials).mockRejectedValue(error);
  await expect(loadSetupCredentials()).rejects.toBe(error);
});

it("keeps valid credentials available to the settings masking flow", async () => {
  const credentials = { jira: { basic: { api_token: "saved-token" } } };
  vi.mocked(loadCredentials).mockResolvedValue(credentials);
  await expect(loadSetupCredentials()).resolves.toBe(credentials);
});
