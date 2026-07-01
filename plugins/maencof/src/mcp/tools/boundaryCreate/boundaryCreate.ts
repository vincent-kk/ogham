/**
 * @file boundaryCreate.ts
 * @description boundary_create tool handler — creates boundary documents in 05_Context/boundary/
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { L5_SUBDIR, LAYER_DIR } from '../../../constants/architecture.js';
import { sanitizeSegment } from '../../../core/filenameSlug/index.js';
import { quoteYamlValue } from '../../../core/yamlParser/index.js';
import { Layer } from '../../../types/common.js';
import { validateFrontmatter } from '../../../types/frontmatter.js';

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
  const slug = sanitizeSegment(input.title);
  const filename = `${slug || `boundary-${Date.now()}`}.md`;
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

  // ─── 객체 단계 검증 (정적 안전 입력의 회귀 방어) ────────────────
  const fmObject: Record<string, unknown> = {
    created: today,
    updated: today,
    tags: input.tags,
    layer: 5,
    sub_layer: 'boundary',
    boundary_type: input.boundary_type,
    connected_layers: input.connected_layers,
    title: input.title,
  };
  const validation = validateFrontmatter(fmObject);
  if (!validation.ok)
    return {
      success: false,
      path: relativePath,
      node_id: '',
      message: `Frontmatter validation failed: ${validation.errors.join('; ')}`,
    };

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
