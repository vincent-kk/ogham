/** A single parsed multipart/form-data part. */
export interface MultipartPart {
  name: string;
  filename?: string;
  mimeType?: string;
  data: Buffer;
}

interface PartHeaders {
  name?: string;
  filename?: string;
  mimeType?: string;
}

const CR = 0x0d;
const LF = 0x0a;
const DASH = 0x2d;
const HEADER_SEPARATOR = Buffer.from("\r\n\r\n");

function splitOnDelimiter(body: Buffer, delimiter: Buffer): Buffer[] {
  const segments: Buffer[] = [];
  let start = 0;
  let index = body.indexOf(delimiter, start);
  while (index !== -1) {
    segments.push(body.subarray(start, index));
    start = index + delimiter.length;
    index = body.indexOf(delimiter, start);
  }
  segments.push(body.subarray(start));
  return segments;
}

function parsePartHeaders(block: Buffer): PartHeaders {
  const text = block.toString("utf8");
  return {
    name: /name="([^"]*)"/i.exec(text)?.[1],
    filename: /filename="([^"]*)"/i.exec(text)?.[1],
    mimeType: /content-type:\s*([^\r\n]+)/i.exec(text)?.[1]?.trim(),
  };
}

/**
 * Parse a multipart/form-data body into its parts over an in-memory buffer.
 * Delimiter search uses binary-safe `Buffer.indexOf`, so image bytes are
 * preserved exactly. Supports the well-formed output of a browser `FormData`
 * submission (CRLF line endings, no nested multipart, no transfer-encoding).
 */
export function parseMultipartBody(
  body: Buffer,
  boundary: string,
): MultipartPart[] {
  const delimiter = Buffer.from(`--${boundary}`);
  const segments = splitOnDelimiter(body, delimiter);
  const parts: MultipartPart[] = [];
  // segments[0] is the preamble; the trailing closing delimiter "--boundary--"
  // leaves a segment starting with "--". Each part sits between two delimiters
  // as CRLF + headers + CRLF CRLF + content + CRLF.
  for (let i = 1; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.length >= 2 && segment[0] === DASH && segment[1] === DASH)
      break;
    let part = segment;
    if (part.length >= 2 && part[0] === CR && part[1] === LF)
      part = part.subarray(2);

    const headerEnd = part.indexOf(HEADER_SEPARATOR);
    if (headerEnd === -1) continue;
    let content = part.subarray(headerEnd + HEADER_SEPARATOR.length);
    if (
      content.length >= 2 &&
      content[content.length - 2] === CR &&
      content[content.length - 1] === LF
    )
      content = content.subarray(0, content.length - 2);

    const headers = parsePartHeaders(part.subarray(0, headerEnd));
    if (headers.name === undefined) continue;
    const item: MultipartPart = { name: headers.name, data: content };
    if (headers.filename !== undefined) item.filename = headers.filename;
    if (headers.mimeType !== undefined) item.mimeType = headers.mimeType;
    parts.push(item);
  }
  return parts;
}
