import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadCredentials } from "../loadCredentials.js";
import { saveCredentials } from "../saveCredentials.js";
import { getAuthHeader } from "../getAuthHeader.js";

/** Isolated storage for runtime validation inputs. */
let directory: string;
/** Credential path owned only by this test. */
let path: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "atlassian-validation-"));
  path = join(directory, "credentials.json");
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it("rejects schema-invalid stored credentials with a secret-free setup instruction", async () => {
  const invalid = {
    jira: { basic: { api_token: "do-not-leak" } },
    confluence: { bearer: { token: 123 } },
  };
  await writeFile(path, JSON.stringify(invalid));
  await expect(loadCredentials(path)).rejects.toThrow(
    "Stored credentials are invalid. Run setup again.",
  );
  await expect(
    getAuthHeader("jira", "user@example.test", path),
  ).rejects.toThrow("Stored credentials are invalid. Run setup again.");
  expect(JSON.parse(await readFile(path, "utf8"))).toEqual(invalid);
});

it("validates before overwriting a credential file", async () => {
  const original = '{"jira":{"bearer":{"token":"keep-me"}}}\n';
  await writeFile(path, original);
  const invalid = { jira: { bearer: { token: 123 } } };
  // @ts-expect-error Runtime clients can supply a value outside the declared credential type.
  const saving = saveCredentials(invalid, path);
  await expect(saving).rejects.toThrow();
  expect(await readFile(path, "utf8")).toBe(original);
});

it("does not create a file when save validation fails", async () => {
  const invalid = { jira: { basic: { api_token: false } } };
  // @ts-expect-error Runtime clients can supply a value outside the declared credential type.
  const saving = saveCredentials(invalid, path);
  await expect(saving).rejects.toThrow();
  await expect(readFile(path)).rejects.toMatchObject({ code: "ENOENT" });
});

it("preserves missing-file behavior and valid credential round trips", async () => {
  expect(await loadCredentials(path)).toEqual({});
  expect(await getAuthHeader("jira", undefined, path)).toBeNull();
  const valid = { jira: { bearer: { token: "new-token" } } };
  await saveCredentials(valid, path);
  expect(await loadCredentials(path)).toEqual(valid);
  expect(await getAuthHeader("jira", undefined, path)).toBe("Bearer new-token");
});
