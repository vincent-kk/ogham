import { buildLightboxFrame } from "./lightboxFrame.js";
import { attachPanZoom } from "./panZoom.js";

const ZOOM_STEP = 1.25;

/**
 * Open a full-screen, pan/zoomable copy of an already-rendered diagram — the
 * readable path for diagrams too dense to follow at inline width. The source SVG
 * stays where it is; the copy keeps its id so mermaid's own scoped <style>
 * (`#deilen-mermaid-N .node { … }`) still matches inside the lightbox.
 */
export function openDiagramLightbox(svg: SVGElement): void {
  const frame = buildLightboxFrame();
  const copy = svg.cloneNode(true) as SVGElement;
  copy.style.maxWidth = "none";
  copy.style.width = "100%";
  copy.style.height = copy.getAttribute("viewBox") ? "100%" : "auto";
  frame.canvas.append(copy);
  document.body.append(frame.overlay);

  const zoom = attachPanZoom(frame.stage, frame.canvas, (scale) => {
    frame.level.textContent = `${Math.round(scale * 100)}%`;
  });

  const close = () => {
    zoom.destroy();
    document.removeEventListener("keydown", onKey);
    frame.overlay.remove();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };

  frame.overlay.addEventListener("click", (event) => {
    const target = event.target as Element;
    const action = target.closest?.("[data-diagram-action]");
    const name = action?.getAttribute("data-diagram-action");
    if (name === "zoom-in") zoom.zoomBy(ZOOM_STEP);
    else if (name === "zoom-out") zoom.zoomBy(1 / ZOOM_STEP);
    else if (name === "reset") zoom.reset();
    else if (name === "close" || target === frame.overlay) close();
  });
  document.addEventListener("keydown", onKey);
}
