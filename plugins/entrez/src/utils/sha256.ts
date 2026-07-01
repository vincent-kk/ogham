import { createHash } from "node:crypto";

/** Hex-encoded SHA-256 of a string or buffer (integrity / reproducibility). */
export function sha256Hex(input: string | ArrayBuffer | Uint8Array): string {
  const hash = createHash("sha256");
  if (typeof input === "string") hash.update(input, "utf-8");
  else
    hash.update(input instanceof ArrayBuffer ? new Uint8Array(input) : input);

  return hash.digest("hex");
}
