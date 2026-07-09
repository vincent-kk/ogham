/**
 * @file templateStaticPrefix.ts
 * @description Static prefix of a message template (text before the first placeholder).
 */
export function templateStaticPrefix(template: string): string {
  return template.split('{')[0];
}
