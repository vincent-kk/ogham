import { openDiagramLightbox } from "./diagramLightbox.js";

const EXPAND_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7"/></svg>';

/** Give a rendered diagram block its "open larger" affordance. A block that failed
 *  to render has no SVG and keeps its readable source instead. */
export function attachExpandButton(node: HTMLElement): void {
  const svg = node.querySelector("svg");
  if (!svg) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "diagram-expand";
  button.title = "Expand diagram";
  button.setAttribute("aria-label", "Expand diagram");
  button.innerHTML = EXPAND_ICON;
  button.addEventListener("click", () => openDiagramLightbox(svg));
  node.append(button);
}
