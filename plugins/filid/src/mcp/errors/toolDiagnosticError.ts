/** Error whose stable code must survive the common MCP error boundary. */
export class ToolDiagnosticError extends Error {
  /** Machine-readable diagnostic code exposed to the MCP caller. */
  readonly code: string;

  /** What the caller does next, carried into the diagnostic unchanged. */
  readonly nextAction: string;

  /**
   * Create an execution error with a caller-visible diagnostic code.
   *
   * @param code - Stable diagnostic code owned by the throwing tool contract.
   * @param message - What failed and why, with the concrete values involved.
   * @param nextAction - The step the caller takes next, naming who decides
   * when it is the user's call.
   * @param options - Optional native error cause metadata.
   */
  constructor(
    code: string,
    message: string,
    nextAction: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ToolDiagnosticError';
    this.code = code;
    this.nextAction = nextAction;
  }
}
