import { describe, it, expect } from "vitest";

import {
  EntrezConfigSchema,
  EntrezCredentialsSchema,
} from "../types/config.js";
import { Db } from "../types/enums.js";
import { DEFAULT_EUTILS_BASE } from "../constants/defaults.js";

describe("EntrezConfigSchema", () => {
  it("parses a minimal config and fills defaults", () => {
    const cfg = EntrezConfigSchema.parse({
      tool: "entrez-test",
      email: "user@example.com",
    });
    expect(cfg.default_db).toBe(Db.PUBMED);
    expect(cfg.base_url).toBe(DEFAULT_EUTILS_BASE);
    expect(cfg.date_tag).toBe(true);
    expect(cfg.output_path.length).toBeGreaterThan(0);
  });

  it("rejects a config missing the required tool", () => {
    expect(
      EntrezConfigSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      EntrezConfigSchema.safeParse({
        tool: "entrez-test",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown db value", () => {
    expect(
      EntrezConfigSchema.safeParse({
        tool: "entrez-test",
        email: "user@example.com",
        default_db: "scholar",
      }).success,
    ).toBe(false);
  });
});

describe("EntrezCredentialsSchema", () => {
  it("allows an empty credentials object (api_key optional)", () => {
    expect(EntrezCredentialsSchema.parse({})).toEqual({});
  });

  it("accepts an api_key string", () => {
    expect(EntrezCredentialsSchema.parse({ api_key: "abc123" }).api_key).toBe(
      "abc123",
    );
  });

  it("rejects an empty api_key string", () => {
    expect(EntrezCredentialsSchema.safeParse({ api_key: "" }).success).toBe(
      false,
    );
  });
});
