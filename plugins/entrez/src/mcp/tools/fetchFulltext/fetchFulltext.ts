import { FulltextFormat } from "../../../types/enums.js";
import type {
  FetchFulltextInput,
  FetchFulltextOutput,
  DownloadedItem,
  UnavailableItem,
} from "../../../types/tool.js";
import type { ToolContext } from "../../shared/index.js";
import { downloadFulltext } from "./operations/downloadFulltext.js";

const DEFAULT_FORMATS = [FulltextFormat.PDF];

/**
 * fetch-fulltext — for each id: resolve PMCID → check OA/license → download
 * requested formats (OA only, license-gated) or report fallback links.
 */
export async function runFetchFulltext(
  input: FetchFulltextInput,
  ctx: ToolContext,
): Promise<FetchFulltextOutput> {
  const formats = input.formats ?? DEFAULT_FORMATS;
  const outDir = input.outDir ?? ctx.config.output_path;
  const overwrite = input.overwrite ?? false;

  const downloaded: DownloadedItem[] = [];
  const unavailable: UnavailableItem[] = [];

  for (const id of input.ids) {
    const result = await downloadFulltext(id, formats, outDir, overwrite, ctx);
    downloaded.push(...result.downloaded);
    unavailable.push(...result.unavailable);
  }

  return { downloaded, unavailable };
}
