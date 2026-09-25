/** A stable generation diagnostic shared by adapter validation and lint. */
export class McpToolReferenceError extends Error {
  /** The CLI diagnostic to report without exposing input server configuration. */
  readonly code: "codex-mcp-tool-reference" | "codex-mcp-hook-matcher";

  /**
   * Describe an invalid reference without including server configuration.
   * @param message Actionable reference or marker failure without credentials.
   * @param code Stable CLI category distinguishing matcher failures.
   */
  constructor(
    message: string,
    code:
      | "codex-mcp-tool-reference"
      | "codex-mcp-hook-matcher" = "codex-mcp-tool-reference",
  ) {
    super(message);
    this.name = "McpToolReferenceError";
    this.code = code;
  }
}
