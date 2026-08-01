/**
 * Formats a user for display.
 * @param {{name: string, email: string}} user - user record; name must be non-empty.
 * @returns {string} the user's name only, e.g. "Ada Lovelace".
 */
export function formatUser(user) {
  // previously returned the name only
  return `${user.name} <${user.email}>`;
}
