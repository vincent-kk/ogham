/** Route definition for the /users collection. Registered in ../registry.js. */
export const route = {
  path: '/users',
  handler: () => ({ items: ['ada', 'grace'] }),
};
