import { MAX_STREAM_CHARS } from "../../../constants/defaults.js";
import { Encoding } from "../../../types/enums.js";
import type { DecodedStream } from "../../../types/rExecution.js";

/**
 * Decode a raw process stream: UTF-8 first (fatal — throws on invalid bytes),
 * then fall back to the WHATWG euc-kr decoder, which covers the CP949/UHC range
 * Korean Windows R emits. Truncates to MAX_STREAM_CHARS.
 */
export function decodeOutput(buffer: Buffer): DecodedStream {
  let text: string;
  let encodingUsed: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    encodingUsed = Encoding.Utf8;
  } catch {
    text = new TextDecoder("euc-kr").decode(buffer);
    encodingUsed = Encoding.Cp949;
  }

  const truncated = text.length > MAX_STREAM_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_STREAM_CHARS) : text,
    truncated,
    encodingUsed,
  };
}
