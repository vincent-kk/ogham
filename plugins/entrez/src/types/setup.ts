/**
 * @file setup.ts
 * @description Setup web-UI contracts. The browser form posts these fields to
 * the local server; secrets flow browser → server → disk only (never the LLM).
 */
import { z } from "zod";

import { DbSchema } from "./enumSchemas.js";

export const SetupFormDataSchema = z.object({
  tool: z.string().min(1),
  email: z.string().email(),
  /** May be the mask sentinel (unchanged) or empty (cleared). */
  api_key: z.string().optional(),
  default_db: DbSchema.optional(),
  base_url: z.string().url().optional(),
  output_path: z.string().optional(),
  date_tag: z.boolean().optional(),
  default_date_range: z
    .object({ from: z.string().optional(), to: z.string().optional() })
    .optional(),
});
export type SetupFormData = z.infer<typeof SetupFormDataSchema>;

export interface SetupServerHandle {
  url: string;
  close: () => Promise<void>;
}

export const SetupInputSchema = z.object({
  mode: z.enum(["new", "edit"]).optional(),
});

export interface SetupParams {
  mode?: "new" | "edit";
}

export interface SetupResult {
  success: boolean;
  message: string;
  url?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  rateLimit?: string;
  dbCount?: number;
}
