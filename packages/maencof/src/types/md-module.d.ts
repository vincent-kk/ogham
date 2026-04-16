// Allows `import content from './file.md'` to yield the file's raw text.
// Production: esbuild resolves via `loader: { '.md': 'text' }` (scripts/build-hooks.mjs).
// Tests: Vite plugin in vitest.config.ts transforms `.md` imports to text exports.
declare module '*.md' {
  const content: string;
  export default content;
}
