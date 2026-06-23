import { mkdir, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";

import {
  ALLOWED_IMAGE_MIME,
  IMAGE_EXT_BY_MIME,
} from "../../../constants/defaults.js";
import { sessionImagesDir } from "../../../constants/paths.js";
import type { ImageRef } from "../../../types/feedback.js";
import { randomId } from "../../../utils/randomId.js";

import { parseMultipartBody } from "./parseMultipartBody.js";

const ALLOWED_MIME: readonly string[] = ALLOWED_IMAGE_MIME;

export interface ParseMultipartOptions {
  sessionId: string;
  maxImageBytes: number;
  maxPayloadBytes: number;
}

export interface ParsedMultipart {
  payload: unknown;
  images: ImageRef[];
}

interface AcceptedImage {
  id: string;
  mimeType: string;
  filename?: string;
  data: Buffer;
}

function extractBoundary(contentType: string | undefined): string {
  const match = /;\s*boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
  const boundary = (match?.[1] ?? match?.[2])?.trim();
  if (!boundary) throw new Error("missing multipart boundary");
  return boundary;
}

/**
 * Buffer the request body under the max-payload cap. Over-limit bodies keep
 * draining (bytes dropped) so the response can be sent and the keep-alive
 * connection stays usable, then reject at end.
 */
function readBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (over) return;
      if (size > maxBytes) {
        over = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (over) reject(new Error("payload exceeds max_payload_mb"));
      else resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function inferSource(filename: string | undefined): ImageRef["source"] {
  return filename?.startsWith("clipboard") ? "clipboard" : "file";
}

/**
 * Parse a multipart feedback submission: a JSON "payload" field plus `img_<id>`
 * image parts. The body is buffered under the max-payload cap and parsed in
 * memory; only after every part clears the mime allowlist and per-image size cap
 * are images written to the session's images dir — so a rejected submission
 * never leaves partial files behind. Reading the request to end means no
 * mid-stream unpipe, so keep-alive needs no manual drain.
 */
export async function parseMultipart(
  req: IncomingMessage,
  options: ParseMultipartOptions,
): Promise<ParsedMultipart> {
  const boundary = extractBoundary(req.headers["content-type"]);
  const body = await readBody(req, options.maxPayloadBytes);
  const parts = parseMultipartBody(body, boundary);

  let payloadRaw: string | undefined;
  const accepted: AcceptedImage[] = [];
  for (const part of parts) {
    if (part.name === "payload") {
      payloadRaw = part.data.toString("utf8");
      continue;
    }
    if (!part.name.startsWith("img_")) continue;
    const mimeType = part.mimeType ?? "";
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new Error(`unsupported image type: ${mimeType}`);
    }
    if (part.data.length > options.maxImageBytes) {
      throw new Error("image exceeds max_image_mb");
    }
    const image: AcceptedImage = {
      id: part.name.slice(4),
      mimeType,
      data: part.data,
    };
    if (part.filename !== undefined) image.filename = part.filename;
    accepted.push(image);
  }

  if (payloadRaw === undefined) throw new Error("missing payload field");
  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    throw new Error("invalid payload json");
  }

  const dir = sessionImagesDir(options.sessionId);
  const written: string[] = [];
  const images: ImageRef[] = [];
  try {
    if (accepted.length) await mkdir(dir, { recursive: true });
    for (const image of accepted) {
      const storageName = `${randomId()}.${IMAGE_EXT_BY_MIME[image.mimeType]}`;
      const fullPath = join(dir, storageName);
      await writeFile(fullPath, image.data);
      written.push(fullPath);
      images.push({
        id: image.id,
        mimeType: image.mimeType,
        filename: image.filename,
        source: inferSource(image.filename),
        bytes: image.data.length,
        path: storageName,
      });
    }
  } catch (err) {
    await Promise.all(written.map((p) => rm(p, { force: true })));
    throw err;
  }

  return { payload, images };
}
