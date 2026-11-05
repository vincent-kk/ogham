import { readFile, readdir, rename, stat } from "node:fs/promises";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { dirname, join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { DIR_MODE, FILE_MODE } from "../../../../constants/defaults.js";
import { sessionImagesDir } from "../../../../constants/paths.js";
import { parseMultipart } from "../parseMultipart.js";

vi.mock("node:fs/promises", { spy: true });

describe("parseMultipart image persistence", () => {
  it("publishes uploaded image bytes by renaming a private temporary file", async () => {
    const filesystem =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    const sessionId = "atomic-image-upload";
    const boundary = "----atomicUploadBoundary";
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    const request = new IncomingMessage(new Socket());
    request.headers["content-type"] =
      `multipart/form-data; boundary=${boundary}`;
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n{}\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="img_photo"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      image,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    vi.mocked(rename).mockImplementationOnce(
      async (temporaryPath, finalPath) => {
        expect(String(temporaryPath)).toMatch(/\.png\.[a-f0-9]+\.tmp$/);
        expect(dirname(String(temporaryPath))).toBe(dirname(String(finalPath)));
        await expect(stat(finalPath)).rejects.toMatchObject({ code: "ENOENT" });
        expect(await readFile(temporaryPath)).toEqual(image);
        expect((await stat(temporaryPath)).mode & 0o777).toBe(FILE_MODE);
        await filesystem.rename(temporaryPath, finalPath);
      },
    );

    const pending = parseMultipart(request, {
      sessionId,
      maxImageBytes: 1024,
      maxPayloadBytes: 4096,
    });
    request.push(body);
    request.push(null);
    const result = await pending;

    expect(rename).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      join(sessionImagesDir(sessionId), result.images[0].path),
    );
    expect(result.payload).toEqual({});
    expect(result.images[0]).toMatchObject({
      id: "photo",
      mimeType: "image/png",
      filename: "photo.png",
      bytes: image.length,
    });
    expect(await readdir(sessionImagesDir(sessionId))).toEqual([
      result.images[0].path,
    ]);
    expect(
      await readFile(join(sessionImagesDir(sessionId), result.images[0].path)),
    ).toEqual(image);
    expect((await stat(sessionImagesDir(sessionId))).mode & 0o777).toBe(
      DIR_MODE,
    );
  });
});
