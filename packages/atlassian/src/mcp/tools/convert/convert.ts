import { convert } from '../../../converter/index.js';
import type { ConvertFormat } from '../../../types/index.js';

interface ConvertParams {
  from: ConvertFormat;
  to: ConvertFormat;
  content: string;
}

interface ConvertResult {
  success: boolean;
  from: ConvertFormat;
  to: ConvertFormat;
  result: string;
  error?: string;
}

/** Format conversion tool handler (pure local, no HTTP) */
export function handleConvert(params: ConvertParams): ConvertResult {
  try {
    const result = convert(params.from, params.to, params.content);
    return { success: true, from: params.from, to: params.to, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, from: params.from, to: params.to, result: '', error: message };
  }
}
