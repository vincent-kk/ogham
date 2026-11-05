// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Create the remove-site button icon.
 * @param {Document} document Page DOM owner.
 * @param {Function} svgElement SVG node factory.
 * @returns {SVGElement} Detached icon; factory errors propagate.
 */
window.__settingsHelpers.createRemoveIcon = function createRemoveIcon(
  document,
  svgElement,
) {
  var svg = svgElement(document, "svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.5",
    "stroke-linecap": "round",
  });
  svg.appendChild(
    svgElement(document, "line", { x1: "2", y1: "2", x2: "10", y2: "10" }),
  );
  svg.appendChild(
    svgElement(document, "line", { x1: "10", y1: "2", x2: "2", y2: "10" }),
  );
  return svg;
};
