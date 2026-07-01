import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

import {
  FulltextFormat,
  OaStatus,
  UnavailableReason,
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
import { resolvePmcid, type ResolvedIds } from "./resolvePmcid.js";

export interface DownloadResult {
  downloaded: DownloadedItem[];
  unavailable: UnavailableItem[];
}

const FTP_PMC_PREFIX = "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/";
const S3_HTTPS_PREFIX = "https://pmc-oa-opendata.s3.amazonaws.com/";
const S3_URI_PREFIX = "s3://pmc-oa-opendata/";
const PMC_WEB_PREFIX = "https://pmc.ncbi.nlm.nih.gov/articles/";
const TAR_BLOCK_SIZE = 512;
const TAR_NAME_OFFSET = 0;
const TAR_NAME_LENGTH = 100;
const TAR_SIZE_OFFSET = 124;
const TAR_SIZE_LENGTH = 12;
const FORMAT_EXTENSIONS: Record<FulltextFormat, readonly string[]> = {
  [FulltextFormat.PDF]: [".pdf"],
  [FulltextFormat.XML]: [".xml", ".nxml"],
  [FulltextFormat.TAR]: [".tar.gz", ".tgz"],
};

function fallbackLinks(
  doi: string | undefined,
  pmcid: string | undefined,
): UnavailableItem["links"] {
  return {
    doi,
    publisher: doi || !pmcid ? undefined : `${PMC_WEB_PREFIX}${pmcid}/`,
  };
}

function normalizeDownloadUrl(href: string): string {
  if (href.startsWith(S3_URI_PREFIX))
    return `${S3_HTTPS_PREFIX}${href.slice(S3_URI_PREFIX.length)}`;

  if (href.startsWith(FTP_PMC_PREFIX))
    return `${S3_HTTPS_PREFIX}deprecated/${href.slice(FTP_PMC_PREFIX.length)}`;

  return href.replace(/^ftp:\/\//i, "https://");
}

async function fetchBytes(href: string, ctx: ToolContext): Promise<Buffer> {
  const url = normalizeDownloadUrl(href);
  const host = new URL(url).hostname;
  const res = await httpRequest(
    { url, injectAuth: false, acceptBinary: true },
    { ...ctx.deps, allowedHosts: [...ctx.deps.allowedHosts, host] },
  );
  if (!res.ok || !res.binary)
    throw new Error(res.error?.message ?? "download failed");

  return Buffer.from(res.binary);
}

function tarString(block: Buffer, offset: number, length: number): string {
  return block
    .subarray(offset, offset + length)
    .toString()
    .replace(/\0.*$/u, "");
}

function extractFromTgz(bytes: Buffer, format: FulltextFormat): Buffer {
  const tar = gunzipSync(bytes);
  let offset = 0;
  while (offset + TAR_BLOCK_SIZE <= tar.byteLength) {
    const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);
    const name = tarString(header, TAR_NAME_OFFSET, TAR_NAME_LENGTH);
    if (!name) break;

    const sizeText = tarString(header, TAR_SIZE_OFFSET, TAR_SIZE_LENGTH).trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const dataStart = offset + TAR_BLOCK_SIZE;
    const dataEnd = dataStart + size;
    if (
      FORMAT_EXTENSIONS[format].some((extension) =>
        name.toLowerCase().endsWith(extension),
      )
    )
      return tar.subarray(dataStart, dataEnd);

    offset = dataStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
  }
  throw new Error("format not found in tgz");
}

/** Download one format link after resolving legacy FTP locations to HTTPS. */
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
  const path = safeOutputPath(outDir, `${pmcid}.${format}`);

  let bytes: Buffer;
  if (!overwrite && existsSync(path)) bytes = await readFile(path);
  else {
    bytes = await fetchBytes(href, ctx);
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

async function downloadFromTgz(
  pmcid: string,
  pmid: string | undefined,
  format: FulltextFormat,
  href: string,
  license: string,
  outDir: string,
  overwrite: boolean,
  ctx: ToolContext,
): Promise<DownloadedItem> {
  const path = safeOutputPath(outDir, `${pmcid}.${format}`);

  let bytes: Buffer;
  if (!overwrite && existsSync(path)) bytes = await readFile(path);
  else {
    const tgzBytes = await fetchBytes(href, ctx);
    bytes = extractFromTgz(tgzBytes, format);
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
  extractTgz: boolean,
  ctx: ToolContext,
): Promise<DownloadResult> {
  const downloaded: DownloadedItem[] = [];
  const unavailable: UnavailableItem[] = [];

  let resolved: ResolvedIds;
  try {
    resolved = await resolvePmcid(id, ctx);
  } catch {
    unavailable.push({
      id,
      reason: UnavailableReason.IDCONV_MOVED,
      links: fallbackLinks(undefined, undefined),
    });
    return { downloaded, unavailable };
  }
  const { pmcid, pmid, doi } = resolved;
  if (!pmcid) {
    unavailable.push({
      id,
      reason: UnavailableReason.NO_PMCID,
      links: fallbackLinks(doi, pmcid),
    });
    return { downloaded, unavailable };
  }

  const oa = await oaService({ pmcid }, ctx.deps);
  if (oa.oaStatus !== OaStatus.OPEN_ACCESS) {
    unavailable.push({
      id,
      reason: UnavailableReason.NOT_OA,
      links: fallbackLinks(doi, pmcid),
    });
    return { downloaded, unavailable };
  }
  if (!oa.license) {
    unavailable.push({
      id,
      reason: UnavailableReason.LICENSE_UNVERIFIED,
      links: fallbackLinks(doi, pmcid),
    });
    return { downloaded, unavailable };
  }

  for (const format of formats) {
    const link = oa.formats.find((f) => f.format === format);
    const tgzLink = oa.formats.find((f) => f.format === FulltextFormat.TAR);
    if (!link) {
      if (tgzLink && format !== FulltextFormat.TAR)
        try {
          downloaded.push(
            extractTgz
              ? await downloadFromTgz(
                  pmcid,
                  pmid,
                  format,
                  tgzLink.href,
                  oa.license,
                  outDir,
                  overwrite,
                  ctx,
                )
              : await downloadOne(
                  pmcid,
                  pmid,
                  FulltextFormat.TAR,
                  tgzLink.href,
                  oa.license,
                  outDir,
                  overwrite,
                  ctx,
                ),
          );
        } catch {
          unavailable.push({
            id,
            reason: UnavailableReason.OA_LINK_DEAD,
            format,
            links: fallbackLinks(doi, pmcid),
          });
        }
      else
        unavailable.push({
          id,
          reason: UnavailableReason.FORMAT_NOT_OFFERED,
          format,
          links: fallbackLinks(doi, pmcid),
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
        reason: UnavailableReason.OA_LINK_DEAD,
        format,
        links: fallbackLinks(doi, pmcid),
      });
    }
  }

  return { downloaded, unavailable };
}
