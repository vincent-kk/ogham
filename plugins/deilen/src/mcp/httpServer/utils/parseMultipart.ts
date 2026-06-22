import busboy from "busboy";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

import {
  ALLOWED_IMAGE_MIME,
  IMAGE_EXT_BY_MIME,
} from "../../../constants/defaults.js";
import { sessionImagesDir } from "../../../constants/paths.js";
import type { ImageRef } from "../../../types/feedback.js";
import { randomId } from "../../../utils/randomId.js";

export interface ParseMultipartOptions {
  sessionId: string;
  maxImageBytes: number;
  maxPayloadBytes: number;
}

export interface ParsedMultipart {
  payload: unknown;
  images: ImageRef[];
}

function inferSource(filename: string | undefined): ImageRef["source"] {
  return filename?.startsWith("clipboard") ? "clipboard" : "file";
}

/**
 * Parse a multipart feedback submission: a JSON "payload" field plus `img_<id>`
 * image parts streamed to disk under the session's images dir. Enforces the mime
 * allowlist, per-image and total-payload size caps, and deletes partial files on
 * any failure.
 */
export function parseMultipart(
  req: IncomingMessage,
  options: ParseMultipartOptions,
): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: options.maxImageBytes,
        files: 32,
        fields: 4,
        fieldSize: options.maxPayloadBytes,
      },
    });

    const dir = sessionImagesDir(options.sessionId);
    const images: ImageRef[] = [];
    const writes: Promise<void>[] = [];
    const cleanup: string[] = [];
    let payloadRaw = "";
    let totalBytes = 0;
    let failure: Error | null = null;

    const fail = (err: Error): void => {
      if (!failure) {
        failure = err;
        req.unpipe(bb);
        bb.destroy();
      }
    };

    bb.on("field", (name, value) => {
      if (name === "payload") payloadRaw = value;
    });

    bb.on("file", (name, stream, info) => {
      if (!name.startsWith("img_")) {
        stream.resume();
        return;
      }
      if (!ALLOWED_IMAGE_MIME.includes(info.mimeType as never)) {
        stream.resume();
        fail(new Error(`unsupported image type: ${info.mimeType}`));
        return;
      }
      const storageName = `${randomId()}.${IMAGE_EXT_BY_MIME[info.mimeType]}`;
      const fullPath = join(dir, storageName);
      cleanup.push(fullPath);
      let bytes = 0;
      writes.push(
        (async () => {
          await mkdir(dir, { recursive: true });
          const ws = createWriteStream(fullPath);
          stream.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            totalBytes += chunk.length;
            if (totalBytes > options.maxPayloadBytes) {
              stream.destroy(new Error("payload exceeds max_payload_mb"));
            }
          });
          stream.on("limit", () => {
            stream.destroy(new Error("image exceeds max_image_mb"));
          });
          await pipeline(stream, ws);
          images.push({
            id: name.slice(4),
            mimeType: info.mimeType,
            filename: info.filename,
            source: inferSource(info.filename),
            bytes,
            path: storageName,
          });
        })().catch((err: unknown) => fail(err as Error)),
      );
    });

    bb.on("error", (err) => fail(err as Error));

    bb.on("close", () => {
      void Promise.all(writes).then(async () => {
        if (failure) {
          await Promise.all(cleanup.map((p) => rm(p, { force: true })));
          reject(failure);
          return;
        }
        try {
          resolve({ payload: JSON.parse(payloadRaw), images });
        } catch {
          reject(new Error("invalid payload json"));
        }
      });
    });

    req.pipe(bb);
  });
}
