import type { ServerResponse } from "node:http";

import { sendJson } from "../utils/sendJson.js";

/**
 * POST /api/ping — viewer heartbeat. Activity (the idle-timer reset) already
 * happened in the route dispatcher; this just acknowledges.
 */
export function handlePing(res: ServerResponse): void {
  sendJson(res, 200, { ok: true });
}
