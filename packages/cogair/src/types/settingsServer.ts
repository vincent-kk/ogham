import { z } from 'zod';

export const SettingsServerSchema = z.object({
  url: z.string().url(),
  token: z.string(),
  port: z.number().int().positive(),
  pid: z.number().int().positive(),
  started_at: z.string(),
  last_activity_at: z.string(),
});

export type SettingsServer = z.infer<typeof SettingsServerSchema>;

export interface SettingsServerHandle {
  url: string;
  token: string;
  close: () => Promise<void>;
}
