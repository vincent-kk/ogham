import { z } from "zod";

export const ThemeSchema = z.enum(["light", "dark", "auto"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const RenderersConfigSchema = z
  .object({
    mermaid: z.boolean().default(true),
    highlight: z.boolean().default(true),
    math: z.boolean().default(true),
  })
  .default({ mermaid: true, highlight: true, math: true });
export type RenderersConfig = z.infer<typeof RenderersConfigSchema>;

const PortSchema = z
  .number()
  .int()
  .refine((p) => p === 0 || (p >= 1024 && p <= 65535), {
    message: "preferred_port must be 0 (dynamic) or 1024-65535",
  });

const FONT_FAMILY_PATTERN = /^[^;{}<>\\@/]*$/;

export const ConfigSchema = z
  .object({
    theme: ThemeSchema.default("auto"),
    auto_open: z.boolean().default(true),
    collect_timeout_seconds: z.number().int().min(1).max(55).default(45),
    session_ttl_hours: z.number().int().min(1).max(720).default(72),
    idle_shutdown_minutes: z.number().int().min(1).max(120).default(10),
    preferred_port: PortSchema.default(0),
    content_width_px: z.number().int().min(480).max(1600).default(820),
    font_family: z
      .string()
      .max(200)
      .regex(FONT_FAMILY_PATTERN, "font_family has invalid characters")
      .default(""),
    renderers: RenderersConfigSchema,
    max_image_mb: z.number().int().min(1).max(100).default(10),
    max_payload_mb: z.number().int().min(1).max(200).default(50),
    max_viewer_mb: z.number().int().min(1).max(50).default(5),
  })
  .refine((c) => c.max_payload_mb >= c.max_image_mb, {
    message: "max_payload_mb must be >= max_image_mb",
    path: ["max_payload_mb"],
  });
export type Config = z.infer<typeof ConfigSchema>;
