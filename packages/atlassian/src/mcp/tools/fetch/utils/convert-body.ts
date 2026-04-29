import { pickBodyFormat } from './pick-body-format.js';
import { renderByFormat } from './render-by-format.js';

/** Convert markdown body for HTTP create/update. Selects ADF/Storage/Wiki by service+apiVersion. */
export function convertBody(
  body: unknown,
  service: 'jira' | 'confluence',
  apiVersion: '2' | '3',
): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };
  const fmt = pickBodyFormat(service, apiVersion);

  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      obj[key] = renderByFormat(obj[key] as string, fmt);
    }
  }

  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = renderByFormat(fields.description as string, fmt);
    }
    obj.fields = fields;
  }

  return obj;
}
