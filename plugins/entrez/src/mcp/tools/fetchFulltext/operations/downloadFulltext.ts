import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  OaStatus,
  UnavailableReason,
  type FulltextFormat,
} from "../../../../types/enums.js";
import type {
  DownloadedItem,
  UnavailableItem,
} from "../../../../types/tool.js";
import type { ToolContext } from "../../../shared/index.js";
import { oaService } from "../../../../adapters/eutils/index.js";
import { httpRequest } from "../../../../core/httpClient/index.js";
import { writeBinary } from "../../../../lib/fileIo.js";
import { sha256Hex } from "../../../../utils/sha256.js";
import { safeOutputPath } from "../../../../utils/path.js";
import { resolvePmcid } from "./resolvePmcid.js";

export interface DownloadResult {
  downloaded: DownloadedItem[];
  unavailable: UnavailableItem[];
}

/** Download one format link (ftp links are upgraded to https on the PMC host). */
async function downloadOne(
  pmcid: string,
  pmid: string | undefined,
  format: FulltextFormat,
  href: string,
  license: string,
  outDir: string,
  overwrite: boolean,
  ctx: ToolContext,
): Promise<DownloadedItem> {
  const url = href.replace(/^ftp:\/\//i, "https://");
  const host = new URL(url).hostname;
  const path = safeOutputPath(outDir, `${pmcid}.${format}`);

  let bytes: Buffer;
  if (!overwrite && existsSync(path)) {
    bytes = await readFile(path);
  } else {
    const res = await httpRequest(
      { url, injectAuth: false, acceptBinary: true },
      { ...ctx.deps, allowedHosts: [...ctx.deps.allowedHosts, host] },
    );
    if (!res.ok || !res.binary) {
      throw new Error(res.error?.message ?? "download failed");
    }
    bytes = Buffer.from(res.binary);
    await writeBinary(path, bytes);
  }

  return {
    pmcid,
    pmid,
    format,
    path,
    sha256: sha256Hex(bytes),
    bytes: bytes.byteLength,
    oaStatus: OaStatus.OPEN_ACCESS,
    license,
  };
}

/**
 * Resolve → oa.fcgi → download for one input id. Enforces the OA + license gate
 * (no license ⇒ link-only, not stored) and isolates per-format failures.
 */
export async function downloadFulltext(
  id: string,
  formats: FulltextFormat[],
  outDir: string,
  overwrite: boolean,
  ctx: ToolContext,
): Promise<DownloadResult> {
  const downloaded: DownloadedItem[] = [];
  const unavailable: UnavailableItem[] = [];

  const { pmcid, pmid, doi } = await resolvePmcid(id, ctx);
  if (!pmcid) {
    unavailable.push({
      id,
      reason: UnavailableReason.NO_PMCID,
      links: { doi },
    });
    return { downloaded, unavailable };
  }

  const oa = await oaService({ pmcid }, ctx.deps);
  if (oa.oaStatus !== OaStatus.OPEN_ACCESS) {
    unavailable.push({ id, reason: UnavailableReason.NOT_OA, links: { doi } });
    return { downloaded, unavailable };
  }
  if (!oa.license) {
    unavailable.push({
      id,
      reason: UnavailableReason.LICENSE_UNVERIFIED,
      links: { doi },
    });
    return { downloaded, unavailable };
  }

  for (const format of formats) {
    const link = oa.formats.find((f) => f.format === format);
    if (!link) {
      unavailable.push({
        id,
        reason: UnavailableReason.FETCH_FAILED,
        format,
        links: { doi },
      });
      continue;
    }
    try {
      downloaded.push(
        await downloadOne(
          pmcid,
          pmid,
          format,
          link.href,
          oa.license,
          outDir,
          overwrite,
          ctx,
        ),
      );
    } catch {
      unavailable.push({
        id,
        reason: UnavailableReason.FETCH_FAILED,
        format,
        links: { doi },
      });
    }
  }

  return { downloaded, unavailable };
}
