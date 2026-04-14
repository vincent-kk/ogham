/** Private/reserved IP ranges that must be blocked */
const PRIVATE_RANGES = [
  /^127\./,                           // loopback
  /^10\./,                            // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,      // Class B private
  /^192\.168\./,                      // Class C private
  /^169\.254\./,                      // link-local
  /^0\./,                             // current network
  /^::1$/,                            // IPv6 loopback
  /^fc00:/i,                          // IPv6 ULA
  /^fe80:/i,                          // IPv6 link-local
  /^::ffff:(127|10|0)\./i,           // IPv4-mapped IPv6
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./i,
  /^::ffff:192\.168\./i,
  /^::ffff:169\.254\./i,
];

/** Check if an IP address falls within private/reserved ranges */
export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}
