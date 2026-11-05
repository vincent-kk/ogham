/** Identifies invalid stored credential data without retaining secret-bearing validation details. */
export class InvalidCredentialsError extends Error {
  /** Create the API-facing recovery instruction; no credential data is accepted. */
  constructor() {
    super("Stored credentials are invalid. Run setup again.");
    this.name = "InvalidCredentialsError";
  }
}
