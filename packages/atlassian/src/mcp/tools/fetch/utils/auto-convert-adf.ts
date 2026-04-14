import { adfToMarkdown } from '../../../../converter/index.js';

/** Detect ADF content in a response and convert to Markdown */
export function autoConvertAdf(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, unknown>;

  for (const key of ['description', 'body']) {
    const field = obj[key];
    if (field && typeof field === 'object' && (field as Record<string, unknown>).type === 'doc') {
      const markdown = adfToMarkdown(field);
      if (markdown) {
        obj[`${key}_markdown`] = markdown;
      }
    }
  }

  if (obj.body && typeof obj.body === 'object') {
    const body = obj.body as Record<string, unknown>;
    if (body.atlas_doc_format && typeof body.atlas_doc_format === 'object') {
      const adf = body.atlas_doc_format as Record<string, unknown>;
      if (typeof adf.value === 'string') {
        try {
          const parsed = JSON.parse(adf.value as string);
          const markdown = adfToMarkdown(parsed);
          if (markdown) {
            (obj as Record<string, unknown>)['body_markdown'] = markdown;
          }
        } catch { /* not valid JSON ADF */ }
      }
    }
  }

  return data;
}
