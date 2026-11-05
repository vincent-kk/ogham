// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Validate a required value.
 * @param {string} fieldPath Field receiving validation errors.
 * @param {string} value Trimmed form input.
 * @param {Function} showError Displays an error for the field.
 * @returns {boolean} Whether the value is valid; display errors propagate.
 */
window.__settingsHelpers.requireField = function requireField(
  fieldPath,
  value,
  showError,
) {
  if (!value || !value.trim()) {
    showError(fieldPath, "This field is required.");
    return false;
  }
  return true;
};
