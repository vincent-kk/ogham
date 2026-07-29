import type {
  ConfigScopeSnapshot,
  SeiriConfig,
} from '../../../../types/config.js';
import { configLayers } from '../utils/configLayers.js';
import { readDialFile } from '../utils/readDialFile.js';

/**
 * Both dial layers as the settings page needs them: what each file says and
 * which one is overriding.
 *
 * The session valve is deliberately absent. It is not an editable
 * namespace — a tool call sets it for one session — and showing it beside
 * the two stored layers would invite editing it here.
 */
export function loadConfigScope(projectRoot: string): ConfigScopeSnapshot {
  const layers = configLayers(projectRoot);
  const project = layers.project as string;

  const user = toConfig(layers.user);
  const projectConfig = toConfig(project);

  return {
    paths: { user: layers.user, project },
    layers: { user, project: projectConfig },
    overridden: projectConfig === null ? [] : ['intervention'],
  };
}

function toConfig(path: string): SeiriConfig | null {
  const { intervention } = readDialFile(path);
  return intervention === null ? null : { intervention };
}
