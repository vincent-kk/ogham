// Loaded by index.html before app.js; registration supplies the settings helper.
"use strict";

/**
 * Create a DOM element with attributes and children.
 * @param {Document} document Page DOM owner.
 * @param {string} tag HTML tag to create.
 * @param {object} attrs Attributes and text to assign.
 * @param {Node[]} [children] Nodes to append.
 * @returns {HTMLElement} Detached element; DOM errors propagate.
 */
window.__settingsHelpers.elementFactory = function elementFactory(
  document,
  tag,
  attrs,
  children,
) {
  var node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (key) {
      if (key === "className") node.className = attrs[key];
      else if (key === "textContent") node.textContent = attrs[key];
      else if (key === "hidden") node.hidden = attrs[key];
      else if (key.indexOf("data-") === 0) node.setAttribute(key, attrs[key]);
      else node.setAttribute(key, attrs[key]);
    });
  }
  if (children) {
    children.forEach(function (child) {
      node.appendChild(child);
    });
  }
  return node;
};
