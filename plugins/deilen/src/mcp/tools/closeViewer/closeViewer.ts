import { getProjectHash } from "../../../core/projectHash/getProjectHash.js";
import { closeSession } from "../../../core/sessionStore/closeSession.js";
import { closeResolver } from "../../../core/sessionStore/feedbackResolver.js";
import { getSession } from "../../../core/sessionStore/getSession.js";

export interface CloseViewerInput {
  session_id: string;
}

export interface CloseViewerOutput {
  status: "closed";
}

/** close_viewer: deactivate a session and settle any pending collect. */
export async function handleCloseViewer(
  input: CloseViewerInput,
): Promise<CloseViewerOutput> {
  const projectHash = getProjectHash(process.cwd());
  const meta = await getSession(input.session_id, projectHash);
  if (!meta) throw new Error(`unknown: no session ${input.session_id}`);
  closeResolver(input.session_id);
  await closeSession(input.session_id);
  return { status: "closed" };
}
