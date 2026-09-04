/** Error whose stable code must survive the common MCP error boundary. */
export class ToolDiagnosticError extends Error {
  /** Machine-readable diagnostic code exposed to the MCP caller. */
  readonly code: string;

  /**
   * Create an execution error with a caller-visible diagnostic code.
   *
   * @param code - Stable diagnostic code owned by the throwing tool contract.
   * @param message - Human-readable detail for the failed operation.
   * @param options - Optional native error cause metadata.
   */
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ToolDiagnosticError';
    this.code = code;
  }
}
