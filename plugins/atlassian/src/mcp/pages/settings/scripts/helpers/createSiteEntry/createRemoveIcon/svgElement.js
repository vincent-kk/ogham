// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Create an SVG node for the remove-site icon.
 * @param {Document} document Page DOM owner.
 * @param {string} tag SVG element name.
 * @param {object} attrs SVG attributes.
 * @returns {SVGElement} Detached node; DOM errors propagate.
 */
window.__settingsHelpers.svgElement = function svgElement(
  document,
  tag,
  attrs,
) {
  var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
  }
  return node;
};
