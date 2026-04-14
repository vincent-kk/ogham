import { markdownToAdf } from '../../../../converter/index.js';

/** Convert markdown content in body to ADF */
export function convertBodyToAdf(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      obj[key] = markdownToAdf(obj[key] as string);
    }
  }

  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = markdownToAdf(fields.description as string);
    }
    obj.fields = fields;
  }

  return obj;
}
