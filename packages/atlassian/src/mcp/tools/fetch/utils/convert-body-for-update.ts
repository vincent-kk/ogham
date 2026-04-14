import { markdownToAdf, markdownToStorage } from '../../../../converter/index.js';

/** Convert markdown in body to ADF or Storage Format (endpoint-aware) */
export function convertBodyForUpdate(body: unknown, endpoint: string): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  const isConfluence = endpoint.includes('/wiki/') || endpoint.includes('/api/v2/pages');

  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      if (isConfluence) {
        obj[key] = { storage: { value: markdownToStorage(obj[key] as string), representation: 'storage' } };
      } else {
        obj[key] = markdownToAdf(obj[key] as string);
      }
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
