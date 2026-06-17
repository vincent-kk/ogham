import { CONFIG_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { type Config, ConfigSchema } from '../../../types/index.js';

export async function saveConfig(config: Config): Promise<void> {
  const validated = ConfigSchema.parse(config);
  await atomicWrite(CONFIG_PATH, `${JSON.stringify(validated, null, 2)}\n`);
}
