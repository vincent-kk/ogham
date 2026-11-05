// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Collect current form values without persisting them.
 * @param {Document} document Page DOM containing site rows.
 * @param {object} state Current selected tab.
 * @param {object} TABS Cloud tab identifier.
 * @param {Function} getField Trimmed text field reader.
 * @param {Function} getCheckbox Checkbox reader.
 * @param {Function} getNumberField Nullable integer field reader.
 * @param {Function} getRadioValue Selected radio reader.
 * @returns {object} Submission payload; reader errors propagate.
 */
window.__settingsHelpers.collectFormData = function collectFormData(
  document,
  state,
  TABS,
  getField,
  getCheckbox,
  getNumberField,
  getRadioValue,
) {
  var isCloud = state.tab === TABS.CLOUD;
  var deployType = isCloud ? "cloud" : "onprem";

  /** @param {string} value Site name or URL. @returns {string} Normalized cloud URL. */
  function normalizeCloudUrl(value) {
    if (!value) return value;
    var v = value.trim();
    if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/, "");
    return "https://" + v + ".atlassian.net";
  }

  if (isCloud) {
    var siteUrls = [];
    var siteEntries = document.querySelectorAll(
      "#cloud-sites-container .site-entry",
    );
    siteEntries.forEach(function (entry) {
      var idx = entry.dataset.siteIndex;
      var url = getField("cloud.sites." + idx + ".base_url");
      if (url) siteUrls.push(normalizeCloudUrl(url));
    });

    var username = getField("cloud.username");
    var apiToken = getField("cloud.api_token");
    var sslVerify = getCheckbox("cloud.ssl_verify");
    var timeout = getNumberField("cloud.timeout");

    return {
      deployment_type: deployType,
      cloud_sites: siteUrls,
      jira: {
        base_url: siteUrls[0] || "",
        username: username,
        api_token: apiToken,
        ssl_verify: sslVerify,
        timeout: timeout,
      },
      confluence: {
        base_url: siteUrls[0] || "",
        username: username,
        api_token: apiToken,
        ssl_verify: sslVerify,
        timeout: timeout,
      },
    };
  } else {
    return {
      deployment_type: deployType,
      jira: {
        base_url: getField("onprem.jira.base_url"),
        username: getField("onprem.jira.username"),
        api_token: getField("onprem.jira.api_token"),
        ssl_verify: getCheckbox("onprem.jira.ssl_verify"),
        timeout: getNumberField("onprem.jira.timeout"),
        api_version_override:
          getRadioValue("onprem.jira.api_version_override") || undefined,
      },
      confluence: {
        base_url: getField("onprem.confluence.base_url"),
        username: getField("onprem.confluence.username"),
        api_token: getField("onprem.confluence.api_token"),
        ssl_verify: getCheckbox("onprem.confluence.ssl_verify"),
        timeout: getNumberField("onprem.confluence.timeout"),
      },
    };
  }
};
