/** Route definition for the /products collection. Registered in ../registry.js. */
export const route = {
  path: '/products',
  handler: () => ({ items: ['keyboard', 'monitor'] }),
};
