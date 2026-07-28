const MIN_SCALE = 0.25;
const MAX_SCALE = 12;
const WHEEL_STEP = 1.12;

/** Live zoom/pan handle over a stage; `destroy` drops every listener it added. */
export interface PanZoomController {
  zoomBy(factor: number): void;
  reset(): void;
  destroy(): void;
}

/** Wheel-zoom and drag-pan `canvas` inside `stage`, reporting every scale change. */
export function attachPanZoom(
  stage: HTMLElement,
  canvas: HTMLElement,
  onScale: (scale: number) => void,
): PanZoomController {
  let scale = 1;
  let x = 0;
  let y = 0;
  let dragX = 0;
  let dragY = 0;
  let dragging = false;

  const apply = () => {
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    onScale(scale);
  };

  // Hold the point under the cursor still while the scale changes around it.
  const zoomAt = (factor: number, originX: number, originY: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    x = originX - ((originX - x) * next) / scale;
    y = originY - ((originY - y) * next) / scale;
    scale = next;
    apply();
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const box = stage.getBoundingClientRect();
    zoomAt(
      event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP,
      event.clientX - box.left,
      event.clientY - box.top,
    );
  };

  const onDown = (event: MouseEvent) => {
    event.preventDefault();
    dragging = true;
    dragX = event.clientX;
    dragY = event.clientY;
    stage.classList.add("dragging");
  };

  const onMove = (event: MouseEvent) => {
    if (!dragging) return;
    x += event.clientX - dragX;
    y += event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    apply();
  };

  const onUp = () => {
    dragging = false;
    stage.classList.remove("dragging");
  };

  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("mousedown", onDown);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  apply();

  return {
    zoomBy: (factor) => {
      const box = stage.getBoundingClientRect();
      zoomAt(factor, box.width / 2, box.height / 2);
    },
    reset: () => {
      scale = 1;
      x = 0;
      y = 0;
      apply();
    },
    destroy: () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    },
  };
}
