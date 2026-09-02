/**
 * Build the stable machine-readable result for an article operation.
 * @param {string} operation completed operation name
 * @param {string} relative article path below library/articles
 * @param {{name: string}} metadata canonical article metadata
 * @returns {{operation: string, articlePath: string, metadataPath: string, markdownLink: string}} result
 */
export function describeArticle(operation, relative, metadata) {
  const articlePath = `library/articles/${relative}`;
  return {
    operation,
    articlePath,
    metadataPath: articlePath.slice(0, -5) + '.json',
    markdownLink: `[${metadata.name}](${articlePath})`,
  };
}
