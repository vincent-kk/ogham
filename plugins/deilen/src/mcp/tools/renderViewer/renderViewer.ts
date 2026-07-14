import { projectRoot } from "@ogham/cross-platform/host-paths";

import { loadConfig } from "../../../core/configManager/index.js";
import { getProjectHash } from "../../../core/projectHash/index.js";
import {
  createSession,
  pruneExpired,
} from "../../../core/sessionStore/index.js";
import { logger } from "../../../lib/logger.js";
import { SessionStatus } from "../../../types/enums.js";
import type { RenderOptions } from "../../../types/renderOptions.js";
import { isoNow } from "../../../utils/isoNow.js";
import { openBrowser } from "../../../utils/openBrowser.js";
import { randomId } from "../../../utils/randomId.js";
import { ensureHttpServer } from "../../httpServer/index.js";

import { deriveTitle } from "./operations/deriveTitle.js";
import { resolveMarkdown } from "./operations/resolveMarkdown.js";

export interface RenderViewerInput {
  content?: string;
  path?: string;
  title?: string;
  options?: RenderOptions;
  project_root?: string;
}

export interface RenderViewerOutput {
  session_id: string;
  url: string;
  status: typeof SessionStatus.Serving;
}

/**
 * render_viewer: register a viewer as a render session, ensure the viewer
 * server is up, and return its URL immediately (non-blocking).
 */
export async function handleRenderViewer(
  input: RenderViewerInput,
): Promise<RenderViewerOutput> {
  const workspace = projectRoot(input.project_root);
  const config = await loadConfig();
  // Bound disk usage during a long-lived process: startup prune is only a
  // backstop, so reclaim expired sessions on render too (best-effort).
  void pruneExpired(config.session_ttl_hours).catch((err: unknown) =>
    logger.warn("session prune failed", { error: (err as Error).message }),
  );
  const { markdown, sourcePath } = await resolveMarkdown(
    input,
    workspace,
    config.max_viewer_mb,
  );
  const title = deriveTitle({ title: input.title, sourcePath, markdown });
  const sessionId = randomId("rs_");
  const server = await ensureHttpServer(workspace);
  const url = server.viewerUrl(sessionId);
  await createSession({
    sessionId,
    projectHash: getProjectHash(workspace),
    title,
    url,
    markdown,
    createdAt: isoNow(),
    options: input.options,
  });
  if (config.auto_open) openBrowser(url);
  return { session_id: sessionId, url, status: SessionStatus.Serving };
}
