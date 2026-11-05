import { describe, expect, it } from "vitest";
import { loadForm } from "./helpers/loadForm.js";

describe("settings form behavior", () => {
  it("collects normalized cloud sites and shared account fields", () => {
    const { api } = loadForm({
      "cloud.sites.0.base_url": " team ",
      "cloud.sites.2.base_url": "https://second.atlassian.net/",
      "cloud.sites.3.base_url": "",
      "cloud.username": " user@example.test ",
      "cloud.api_token": " secret ",
      "cloud.ssl_verify": "false",
      "cloud.timeout": "45000",
    });
    const account = {
      base_url: "https://team.atlassian.net",
      username: "user@example.test",
      api_token: "secret",
      ssl_verify: false,
      timeout: 45000,
    };
    expect(api.collectFormData()).toEqual({
      deployment_type: "cloud",
      cloud_sites: [
        "https://team.atlassian.net",
        "https://second.atlassian.net",
      ],
      jira: account,
      confluence: account,
    });
    expect(api.validateForm()).toBe(true);
  });

  it("allows empty optional cloud sites but rejects malformed ones", () => {
    const fields = {
      "cloud.sites.0.base_url": "team",
      "cloud.sites.1.base_url": "",
      "cloud.username": "user",
      "cloud.api_token": "token",
    };
    expect(loadForm(fields).api.validateForm()).toBe(true);
    const { api, errors } = loadForm({
      ...fields,
      "cloud.sites.1.base_url": "bad site!",
    });
    expect(api.validateForm()).toBe(false);
    expect(errors).toContain(
      "Enter a site name (e.g. my-company) or full URL (https://my-company.atlassian.net)",
    );
  });

  it("requires the first cloud site and both account credentials", () => {
    const { api, errors } = loadForm({
      "cloud.sites.0.base_url": "",
      "cloud.username": "",
      "cloud.api_token": "",
    });
    expect(api.validateForm()).toBe(false);
    expect(errors).toEqual(Array(3).fill("This field is required."));
  });

  it("collects on-premise settings with optional usernames and API override", () => {
    const { api } = loadForm(
      {
        "onprem.jira.base_url": "https://jira.example.test",
        "onprem.jira.api_token": "jira-token",
        "onprem.jira.api_version_override": "2",
        "onprem.confluence.base_url": "https://wiki.example.test",
        "onprem.confluence.api_token": "wiki-token",
      },
      "on-premise",
    );
    expect(api.validateForm()).toBe(true);
    expect(api.collectFormData()).toEqual({
      deployment_type: "onprem",
      jira: {
        base_url: "https://jira.example.test",
        username: "",
        api_token: "jira-token",
        ssl_verify: true,
        timeout: null,
        api_version_override: "2",
      },
      confluence: {
        base_url: "https://wiki.example.test",
        username: "",
        api_token: "wiki-token",
        ssl_verify: true,
        timeout: null,
      },
    });
  });

  it("requires HTTP URLs and tokens for both on-premise services", () => {
    const { api, errors } = loadForm(
      {
        "onprem.jira.base_url": "jira",
        "onprem.jira.api_token": "",
        "onprem.confluence.base_url": "",
        "onprem.confluence.api_token": "",
      },
      "on-premise",
    );
    expect(api.validateForm()).toBe(false);
    expect(errors).toEqual([
      "Must start with http:// or https://",
      ...Array(3).fill("This field is required."),
    ]);
  });
});
