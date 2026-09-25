/** Generation failure for an explicit, invalid prebuilt hook directory. */
export class CodexHookRuntimeError extends Error {
  /** Construct a fixed diagnostic without reflecting configuration content. */
  constructor() {
    super(
      "Codex hook runtime must be a relative directory under bridge/ using alphanumeric, underscore or hyphen segments",
    );
    this.name = "CodexHookRuntimeError";
  }
}
