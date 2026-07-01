import { XMLParser } from "fast-xml-parser";

/**
 * PubMed/PMC XML nodes that repeat — forced to arrays so downstream parsing has
 * a stable shape (single vs. many is otherwise ambiguous in fast-xml-parser).
 */
const ARRAY_NODES = new Set([
  "PubmedArticle",
  "Author",
  "MeshHeading",
  "ArticleId",
  "AbstractText",
  "Identifier",
  "link",
  "record",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false, // keep PMIDs/years as strings
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_NODES.has(name),
});

/** Parse an XML string into a plain JS object tree. */
export function parseXml(xml: string): unknown {
  return parser.parse(xml);
}

/** Normalize a single-or-array value (or undefined) into an array. */
export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Read the text content of a node (string, {#text}, or undefined). */
export function textOf(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as object)) {
    const text = (node as Record<string, unknown>)["#text"];
    if (text === undefined || text === null) return undefined;
    return typeof text === "string" ? text : String(text);
  }
  return undefined;
}

/**
 * Recursively collect all text content under a node (joined by spaces),
 * skipping attributes. Handles inline markup in PubMed titles/abstracts
 * (e.g. <i>, <sub>) without losing the wrapped text.
 */
export function collectText(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object")
    return Object.entries(node as Record<string, unknown>)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, value]) => collectText(value))
      .join(" ");

  return "";
}
