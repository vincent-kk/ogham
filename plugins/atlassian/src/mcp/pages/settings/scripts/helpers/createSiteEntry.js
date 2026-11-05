// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Create one removable cloud site row.
 * @param {Document} document Page DOM owner.
 * @param {number} idx Unique site field index.
 * @param {object} helpers Element and icon factories.
 * @returns {HTMLElement} Detached row with its remove handler; DOM errors propagate.
 */
window.__settingsHelpers.createSiteEntry = function createSiteEntry(
  document,
  idx,
  helpers,
) {
  var input = helpers.elementFactory(document, "input", {
    type: "text",
    "data-field": "cloud.sites." + idx + ".base_url",
    placeholder: "your-site-name or https://your-site-name.atlassian.net",
    autocomplete: "off",
  });

  var removeBtn = helpers.elementFactory(
    document,
    "button",
    {
      type: "button",
      className: "btn-remove-site",
      "aria-label": "Remove site",
      "data-remove-index": String(idx),
    },
    [helpers.createRemoveIcon(document, helpers.svgElement)],
  );

  var entry = helpers.elementFactory(
    document,
    "div",
    { className: "site-entry", "data-site-index": String(idx) },
    [
      helpers.elementFactory(document, "div", { className: "form-group" }, [
        helpers.elementFactory(document, "label", {}, [
          document.createTextNode("Site Name "),
          helpers.elementFactory(document, "span", {
            className: "optional",
            textContent: "(optional)",
          }),
        ]),
        helpers.elementFactory(
          document,
          "div",
          { className: "input-with-action" },
          [input, removeBtn],
        ),
        helpers.elementFactory(document, "span", {
          className: "field-error",
          hidden: true,
        }),
      ]),
    ],
  );

  removeBtn.addEventListener("click", function () {
    entry.remove();
  });
  return entry;
};
