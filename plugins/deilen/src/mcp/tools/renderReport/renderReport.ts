import { loadConfig } from "../../../core/configManager/loadConfig.js";
import { getProjectHash } from "../../../core/projectHash/getProjectHash.js";
import { createSession } from "../../../core/sessionStore/createSession.js";
import type { RenderOptions } from "../../../types/renderOptions.js";
import { isoNow } from "../../../utils/isoNow.js";
import { openBrowser } from "../../../utils/openBrowser.js";
import { randomId } from "../../../utils/randomId.js";
import { ensureHttpServer } from "../../httpServer/index.js";

import { deriveTitle } from "./deriveTitle.js";
import { resolveMarkdown } from "./resolveMarkdown.js";

export interface RenderReportInput {
  content?: string;
  path?: string;
  title?: string;
  options?: RenderOptions;
}

export interface RenderReportOutput {
  session_id: string;
  url: string;
  status: "serving";
}

/**
 * render_report: register a report as a render session, ensure the viewer
 * server is up, and return its URL immediately (non-blocking).
 */
export async function handleRenderReport(
  input: RenderReportInput,
): Promise<RenderReportOutput> {
  const config = await loadConfig();
  const { markdown, sourcePath } = await resolveMarkdown(
    input,
    config.max_report_mb,
  );
  const title = deriveTitle({ title: input.title, sourcePath, markdown });
  const sessionId = randomId("rs_");
  const server = await ensureHttpServer();
  const url = server.reportUrl(sessionId);
  await createSession({
    sessionId,
    projectHash: getProjectHash(process.cwd()),
    title,
    url,
    markdown,
    createdAt: isoNow(),
    options: input.options,
  });
  if (config.auto_open) openBrowser(url);
  return { session_id: sessionId, url, status: "serving" };
}
