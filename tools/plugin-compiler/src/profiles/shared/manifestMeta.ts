import type { PluginIR } from "../../types/ir.js";

/**
 * The metadata fields common to every host manifest (name, version, description,
 * and the optional author/repository/homepage/license/keywords). Each profile
 * appends its host-specific fields (skills/mcpServers pointers, store metadata).
 */
export function manifestMeta(ir: PluginIR): Record<string, unknown> {
  const m: Record<string, unknown> = {
    name: ir.name,
    version: ir.version,
    description: ir.description,
  };
  if (ir.author) m.author = ir.author;
  if (ir.repository) m.repository = ir.repository;
  if (ir.homepage) m.homepage = ir.homepage;
  if (ir.license) m.license = ir.license;
  if (ir.keywords) m.keywords = ir.keywords;
  return m;
}
