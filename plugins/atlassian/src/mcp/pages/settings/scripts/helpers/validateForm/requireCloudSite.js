// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Validate a required cloud URL or site name.
 * @param {string} fieldPath Field receiving validation errors.
 * @param {string} value Trimmed form input.
 * @param {Function} showError Displays an error for the field.
 * @returns {boolean} Whether the value is valid; display errors propagate.
 */
window.__settingsHelpers.requireCloudSite = function requireCloudSite(
  fieldPath,
  value,
  showError,
) {
  if (!value || !value.trim()) {
    showError(fieldPath, "This field is required.");
    return false;
  } else {
    var v = value.trim();
    var isUrl = /^https?:\/\//i.test(v);
    var isSiteName = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(v);
    if (!isUrl && !isSiteName) {
      showError(
        fieldPath,
        "Enter a site name (e.g. my-company) or full URL (https://my-company.atlassian.net)",
      );
      return false;
    }
  }
  return true;
};
