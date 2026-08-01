/** Route definition for the /orders collection. Registered in ../registry.js. */
export const route = {
  path: '/orders',
  handler: () => ({ items: ['o-1', 'o-2'] }),
};
