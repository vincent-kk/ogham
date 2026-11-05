// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Validate visible service fields and display errors.
 * @param {Document} document Page DOM containing cloud site rows.
 * @param {Function} collectFormData Current payload reader.
 * @param {Function} getField Trimmed text field reader.
 * @param {Function} clearErrors Clears prior validation messages.
 * @param {Function} showError Displays a field error.
 * @param {object} validators Field validation helpers.
 * @returns {boolean} Whether submission is valid; dependency errors propagate.
 */
window.__settingsHelpers.validateForm = function validateForm(
  document,
  collectFormData,
  getField,
  clearErrors,
  showError,
  validators,
) {
  clearErrors();
  var data = collectFormData();
  var valid = true;

  if (data.deployment_type === "cloud") {
    var siteEntries = document.querySelectorAll(
      "#cloud-sites-container .site-entry",
    );
    siteEntries.forEach(function (entry, i) {
      var idx = entry.dataset.siteIndex;
      var fieldPath = "cloud.sites." + idx + ".base_url";
      var value = getField(fieldPath);
      if (i === 0) {
        valid =
          validators.requireCloudSite(fieldPath, value, showError) && valid;
      } else if (value && value.trim()) {
        // Optional sites: validate format only when filled
        valid =
          validators.requireCloudSite(fieldPath, value, showError) && valid;
      }
    });
    valid =
      validators.requireField(
        "cloud.username",
        data.jira ? data.jira.username : "",
        showError,
      ) && valid;
    valid =
      validators.requireField(
        "cloud.api_token",
        data.jira ? data.jira.api_token : "",
        showError,
      ) && valid;
  } else {
    // On-prem: username is optional (PAT/Bearer auth path).
    valid =
      validators.requireUrl(
        "onprem.jira.base_url",
        data.jira ? data.jira.base_url : "",
        showError,
      ) && valid;
    valid =
      validators.requireField(
        "onprem.jira.api_token",
        data.jira ? data.jira.api_token : "",
        showError,
      ) && valid;
    valid =
      validators.requireUrl(
        "onprem.confluence.base_url",
        data.confluence ? data.confluence.base_url : "",
        showError,
      ) && valid;
    valid =
      validators.requireField(
        "onprem.confluence.api_token",
        data.confluence ? data.confluence.api_token : "",
        showError,
      ) && valid;
  }

  return valid;
};
