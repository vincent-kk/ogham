/**
 * @file boundary-create.ts
 * @description boundary_create tool handler — creates boundary documents in 05_Context/boundary/
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { quoteYamlValue } from '../../../core/yaml-parser/index.js';
import { L5_SUBDIR, LAYER_DIR, Layer } from '../../../types/common.js';

/** boundary_create input */
export interface BoundaryCreateInput {
  /** Boundary document title */
  title: string;
  /** Boundary object type */
  boundary_type: 'project_moc' | 'cross_domain' | 'synthesis';
  /** Connected layer numbers */
  connected_layers: number[];
  /** Tag list */
  tags: string[];
}

/** boundary_create output */
export interface BoundaryCreateResult {
  success: boolean;
  path: string;
  node_id: string;
  message?: string;
}

/**
 * Sanitize title into a safe filename.
 */
function sanitizeFilename(hint: string): string {
  return hint
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/**
 * boundary_create handler
 *
 * Creates a boundary document in 05_Context/boundary/ with appropriate frontmatter.
 */
export async function handleBoundaryCreate(
  vaultPath: string,
  input: BoundaryCreateInput,
): Promise<BoundaryCreateResult> {
  const layerDir = LAYER_DIR[Layer.L5_CONTEXT];
  const subDir = L5_SUBDIR['boundary'];
  const filename = sanitizeFilename(input.title) + '.md';
  const relativePath = `${layerDir}/${subDir}/${filename}`;
  const absolutePath = join(vaultPath, relativePath);

  // Duplicate check
  try {
    await access(absolutePath);
    return {
      success: false,
      path: relativePath,
      node_id: '',
      message: `File already exists: ${relativePath}`,
    };
  } catch {
    // File doesn't exist — proceed
  }

  // Build frontmatter
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = `[${input.tags.map((t) => quoteYamlValue(t)).join(', ')}]`;
  const connectedLayersYaml = `[${input.connected_layers.join(', ')}]`;

  const frontmatter = [
    '---',
    `created: ${today}`,
    `updated: ${today}`,
    `tags: ${tagsYaml}`,
    `layer: 5`,
    `sub_layer: boundary`,
    `boundary_type: ${quoteYamlValue(input.boundary_type)}`,
    `connected_layers: ${connectedLayersYaml}`,
    `title: ${quoteYamlValue(input.title)}`,
    '---',
  ].join('\n');

  const fileContent = `${frontmatter}\n# ${input.title}\n\n`;

  // Create directory + write file
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileContent, 'utf-8');

  return {
    success: true,
    path: relativePath,
    node_id: relativePath,
    message: `Boundary document created: ${relativePath}`,
  };
}
