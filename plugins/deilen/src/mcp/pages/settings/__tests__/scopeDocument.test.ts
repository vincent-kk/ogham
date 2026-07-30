/**
 * The project layer submits only what it overrides, so the document the page
 * builds decides which keys the project file keeps and which fall back to user.
 * The expectations below are the measured behaviour of the shared merge helpers
 * this module replaced — a project save must not change shape.
 */
import { describe, expect, it } from "vitest";

import { projectDocument } from "../scripts/scopeDocument.js";

/** The leaf set the settings form collects, including the nested group. */
const FULL = {
  theme: "dark",
  auto_open: true,
  collect_timeout_seconds: 600,
  session_ttl_hours: 72,
  idle_shutdown_minutes: 1,
  preferred_port: 0,
  content_width_px: 820,
  font_family: "",
  renderers: { mermaid: true, highlight: false, math: true },
  max_image_mb: 10,
  max_payload_mb: 50,
  max_viewer_mb: 5,
};

describe("projectDocument", () => {
  it("is empty when nothing is overridden", () => {
    expect(projectDocument(FULL, new Set())).toEqual({});
  });

  it("keeps a flat overridden leaf", () => {
    expect(projectDocument(FULL, new Set(["theme"]))).toEqual({
      theme: "dark",
    });
  });

  it("keeps a nested leaf under its own parent only", () => {
    expect(projectDocument(FULL, new Set(["renderers.highlight"]))).toEqual({
      renderers: { highlight: false },
    });
  });

  it("keeps flat and nested overrides together", () => {
    const overridden = new Set(["max_image_mb", "renderers.mermaid"]);
    expect(projectDocument(FULL, overridden)).toEqual({
      renderers: { mermaid: true },
      max_image_mb: 10,
    });
  });

  it("rebuilds the whole group when every leaf under it is overridden", () => {
    const overridden = new Set([
      "renderers.mermaid",
      "renderers.highlight",
      "renderers.math",
    ]);
    expect(projectDocument(FULL, overridden)).toEqual({
      renderers: { mermaid: true, highlight: false, math: true },
    });
  });

  it("keeps falsy values — they are overrides like any other", () => {
    const overridden = new Set(["font_family", "preferred_port", "auto_open"]);
    expect(projectDocument(FULL, overridden)).toEqual({
      auto_open: true,
      preferred_port: 0,
      font_family: "",
    });
  });

  it("skips a path the form does not carry", () => {
    expect(projectDocument(FULL, new Set(["last_intent"]))).toEqual({});
  });

  it("leaves no empty parent behind when the child is missing", () => {
    expect(projectDocument(FULL, new Set(["renderers.absent"]))).toEqual({});
  });

  it("does not mutate the collected document", () => {
    const source = { renderers: { mermaid: true } };
    const result = projectDocument(source, new Set(["renderers.mermaid"]));
    (result as any).renderers.mermaid = false;
    expect(source.renderers.mermaid).toBe(true);
  });
});
