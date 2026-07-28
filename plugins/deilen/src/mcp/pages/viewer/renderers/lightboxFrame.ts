/** Toolbar + stage chrome of the diagram lightbox, before any diagram is put in it. */
export interface LightboxFrame {
  overlay: HTMLDivElement;
  stage: HTMLDivElement;
  canvas: HTMLDivElement;
  level: HTMLSpanElement;
}

function actionButton(
  name: string,
  label: string,
  glyph: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-btn";
  button.dataset.diagramAction = name;
  button.setAttribute("aria-label", label);
  button.textContent = glyph;
  return button;
}

/** Assemble the lightbox DOM. Actions are read off `data-diagram-action`. */
export function buildLightboxFrame(): LightboxFrame {
  const overlay = document.createElement("div");
  overlay.className = "diagram-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Diagram viewer");

  const level = document.createElement("span");
  level.className = "diagram-zoom-level";
  level.textContent = "100%";

  const toolbar = document.createElement("div");
  toolbar.className = "diagram-toolbar";
  toolbar.append(
    actionButton("zoom-out", "Zoom out", "−"),
    level,
    actionButton("zoom-in", "Zoom in", "+"),
    actionButton("reset", "Fit to screen", "Fit"),
    actionButton("close", "Close diagram", "✕"),
  );

  const canvas = document.createElement("div");
  canvas.className = "diagram-canvas";
  const stage = document.createElement("div");
  stage.className = "diagram-stage";
  stage.append(canvas);

  overlay.append(toolbar, stage);
  return { overlay, stage, canvas, level };
}
