import { describe, it, expect } from "vitest";

import { EUTILS_HOST } from "../../../../constants/defaults.js";
import { EntrezConfigSchema } from "../../../../types/config.js";
import { MeshMatch } from "../../../../types/enums.js";
import type { ToolContext } from "../../../shared/index.js";
import { runMeshLookup } from "../meshLookup.js";

describe("meshLookup per-term failures", () => {
  it.each([
    { endpoint: "esearch.fcgi", fault: "HTTP" },
    { endpoint: "esummary.fcgi", fault: "HTTP" },
    { endpoint: "esearch.fcgi", fault: "network" },
    { endpoint: "esummary.fcgi", fault: "network" },
    { endpoint: "esearch.fcgi", fault: "JSON" },
    { endpoint: "esummary.fcgi", fault: "JSON" },
    { endpoint: "esearch.fcgi", fault: "envelope" },
    { endpoint: "esummary.fcgi", fault: "envelope" },
    { endpoint: "none", fault: "none" },
  ])(
    "isolates $endpoint $fault failures from genuine misses and other terms",
    async ({ endpoint, fault }) => {
      const config = EntrezConfigSchema.parse({
        tool: "entrez-test",
        email: "user@example.com",
      });
      const requested: string[] = [];
      const fetchImpl: typeof fetch = async (input) => {
        const url = new URL(String(input));
        const term = url.searchParams.get("term") ?? url.searchParams.get("id");
        requested.push(`${url.pathname}:${term}`);
        if (term === "broken" && url.pathname.endsWith(endpoint)) {
          if (fault === "HTTP")
            return new Response("test-only-secret", { status: 503 });
          if (fault === "network") throw new Error("test-only-secret");
          if (fault === "JSON") return new Response("test-only-secret");
          if (fault === "envelope") return new Response("{}");
        }
        if (url.pathname.endsWith("esearch.fcgi"))
          return new Response(
            JSON.stringify({
              esearchresult: {
                count: term === "absent" ? "0" : "1",
                idlist: term === "absent" ? [] : [term],
              },
            }),
          );
        return new Response(
          JSON.stringify({
            result: {
              [term ?? ""]: {
                ds_meshterms: ["Descriptor", "Synonym"],
                ds_meshui: "D000001",
                ds_scopenote: "Scope note",
              },
            },
          }),
        );
      };
      const ctx: ToolContext = {
        config,
        credentials: {},
        deps: {
          tool: config.tool,
          email: config.email,
          allowedHosts: [EUTILS_HOST],
          allowPrivateIp: true,
          maxRetries: 0,
          sleep: async () => {},
          fetchImpl,
        },
        baseUrl: config.base_url,
        db: config.default_db,
      };
      const out = await runMeshLookup(
        { terms: ["before", "absent", "broken", "after"] },
        ctx,
      );
      expect(out.mappings).toEqual([
        {
          input: "before",
          matched: MeshMatch.DESCRIPTOR,
          descriptorName: "Descriptor",
          descriptorUi: "D000001",
          entryTerms: ["Descriptor", "Synonym"],
          scopeNote: "Scope note",
        },
        { input: "absent", matched: MeshMatch.NONE },
        fault === "none"
          ? {
              input: "broken",
              matched: MeshMatch.DESCRIPTOR,
              descriptorName: "Descriptor",
              descriptorUi: "D000001",
              entryTerms: ["Descriptor", "Synonym"],
              scopeNote: "Scope note",
            }
          : {
              input: "broken",
              matched: MeshMatch.NONE,
              error: "MeSH lookup failed",
            },
        {
          input: "after",
          matched: MeshMatch.DESCRIPTOR,
          descriptorName: "Descriptor",
          descriptorUi: "D000001",
          entryTerms: ["Descriptor", "Synonym"],
          scopeNote: "Scope note",
        },
      ]);
      expect(out.mappings[0]).not.toHaveProperty("error");
      expect(out.mappings[1]).not.toHaveProperty("error");
      expect(out.mappings[3]).not.toHaveProperty("error");
      expect(JSON.stringify(out)).not.toContain("test-only-secret");
      expect(requested.at(-1)).toMatch(/esummary\.fcgi:after$/);
      expect(requested).not.toContainEqual(
        expect.stringMatching(/esummary\.fcgi:absent$/),
      );
    },
  );
});
