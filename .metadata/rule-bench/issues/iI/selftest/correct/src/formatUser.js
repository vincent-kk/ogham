/**
 * Formats a user for display.
 * @param {{name: string, email: string}} user - user record; name must be non-empty.
 * @returns {string} the name followed by the email in angle brackets, e.g. "Ada <ada@example.com>".
 */
export function formatUser(user) {
  return `${user.name} <${user.email}>`;
}
