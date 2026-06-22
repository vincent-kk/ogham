import { z } from "zod";

import { ThemeSchema } from "./config.js";

export const RenderOptionsSchema = z.object({
  theme: ThemeSchema.optional(),
  content_width_px: z.number().int().min(480).max(1600).optional(),
  renderers: z
    .object({
      mermaid: z.boolean().optional(),
      highlight: z.boolean().optional(),
      math: z.boolean().optional(),
    })
    .optional(),
});
export type RenderOptions = z.infer<typeof RenderOptionsSchema>;
