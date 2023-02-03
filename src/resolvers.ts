// dummy data until we can get actual data
const lists = [
  {
    title: 'Recipes',
    author: 'Kate Chopin',
  },
  {
    title: 'Top 10 Places to Visit in Paris',
    author: 'Paul Auster',
  },
];

// dummy resolver
export const resolvers = {
  Query: {
    lists: () => lists,
  },
};
