import { describe, expect, it } from "vitest";

import { parseMultipartBody } from "../utils/parseMultipartBody.js";

const B = "----testBoundaryAa1Bb2";

function part(headers: string, data: Buffer | string): Buffer {
  const head = Buffer.from(`--${B}\r\n${headers}\r\n\r\n`);
  const body = typeof data === "string" ? Buffer.from(data) : data;
  return Buffer.concat([head, body, Buffer.from("\r\n")]);
}
function body(...parts: Buffer[]): Buffer {
  return Buffer.concat([...parts, Buffer.from(`--${B}--\r\n`)]);
}
const field = (name: string, value: string): Buffer =>
  part(`Content-Disposition: form-data; name="${name}"`, value);
const file = (
  name: string,
  filename: string,
  mime: string,
  data: Buffer,
): Buffer =>
  part(
    `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${mime}`,
    data,
  );

describe("parseMultipartBody", () => {
  it("parses a single field", () => {
    const parts = parseMultipartBody(body(field("payload", "{}")), B);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ name: "payload" });
    expect(parts[0].data.toString()).toBe("{}");
  });

  it("parses a field plus a file part with mime and filename", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const parts = parseMultipartBody(
      body(field("payload", "{}"), file("img_x1", "a.png", "image/png", png)),
      B,
    );
    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatchObject({
      name: "img_x1",
      filename: "a.png",
      mimeType: "image/png",
    });
    expect(parts[1].data.equals(png)).toBe(true);
  });

  it("parses multiple file parts in order", () => {
    const parts = parseMultipartBody(
      body(
        field("payload", "{}"),
        file("img_a", "a.png", "image/png", Buffer.from("AAA")),
        file("img_b", "b.gif", "image/gif", Buffer.from("BBB")),
      ),
      B,
    );
    expect(parts.map((p) => p.name)).toEqual(["payload", "img_a", "img_b"]);
    expect(parts[2].mimeType).toBe("image/gif");
  });

  it("preserves binary bytes containing CRLF and dashes exactly", () => {
    const tricky = Buffer.from([
      0x00, 0x0d, 0x0a, 0xff, 0x0d, 0x0a, 0x2d, 0x2d, 0x41,
    ]);
    const parts = parseMultipartBody(
      body(file("img_x", "x.png", "image/png", tricky)),
      B,
    );
    expect(parts[0].data.equals(tricky)).toBe(true);
  });

  it("does not mistake a lone dash run inside data for the closing delimiter", () => {
    const data = Buffer.from("a--b--c");
    const parts = parseMultipartBody(
      body(file("img_x", "x.png", "image/png", data)),
      B,
    );
    expect(parts[0].data.toString()).toBe("a--b--c");
  });

  it("keeps a part whose name is neither payload nor img_ (filtering is the caller's job)", () => {
    const parts = parseMultipartBody(body(field("other", "v")), B);
    expect(parts).toHaveLength(1);
    expect(parts[0].name).toBe("other");
  });

  it("leaves filename and mimeType undefined for a plain field", () => {
    const parts = parseMultipartBody(body(field("payload", "x")), B);
    expect(parts[0].filename).toBeUndefined();
    expect(parts[0].mimeType).toBeUndefined();
  });

  it("handles an empty zero-byte file part", () => {
    const parts = parseMultipartBody(
      body(file("img_x", "e.png", "image/png", Buffer.alloc(0))),
      B,
    );
    expect(parts).toHaveLength(1);
    expect(parts[0].data).toHaveLength(0);
  });

  it("ignores the closing-delimiter epilogue", () => {
    const parts = parseMultipartBody(body(field("payload", "{}")), B);
    expect(parts).toHaveLength(1);
  });

  it("returns no parts for a body without the delimiter", () => {
    const parts = parseMultipartBody(Buffer.from("not multipart at all"), B);
    expect(parts).toHaveLength(0);
  });

  it("skips a malformed part missing the header separator", () => {
    const malformed = Buffer.concat([
      Buffer.from(`--${B}\r\nbroken-part-no-header-terminator`),
      Buffer.from(`\r\n--${B}--\r\n`),
    ]);
    expect(parseMultipartBody(malformed, B)).toHaveLength(0);
  });

  it("reads the Content-Type header case-insensitively", () => {
    const p = part(
      `Content-Disposition: form-data; name="img_x"; filename="x.webp"\r\nCONTENT-TYPE: image/webp`,
      Buffer.from("d"),
    );
    const parts = parseMultipartBody(body(p), B);
    expect(parts[0].mimeType).toBe("image/webp");
  });
});
