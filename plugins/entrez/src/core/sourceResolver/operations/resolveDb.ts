import { Db } from "../../../types/enums.js";
import { DEFAULT_DB } from "../../../constants/defaults.js";

const DB_VALUES = new Set<string>(Object.values(Db));

/**
 * Resolve a db input to a valid `Db` (single NCBI db family). Undefined falls
 * back to the default (pubmed); an unknown value throws — entrez is NCBI-only.
 */
export function resolveDb(input?: string): Db {
  if (input === undefined) return DEFAULT_DB;
  if (DB_VALUES.has(input)) return input as Db;
  throw new Error(
    `Unknown db "${input}". entrez supports only ${Object.values(Db).join(", ")}.`,
  );
}
