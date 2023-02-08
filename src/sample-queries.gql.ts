import { gql } from 'graphql-tag';

export const GET_LISTS = gql`
  query lists {
    lists {
      id
      title
      owner
      slug
      description
      status
      listItems {
        id
        listId
        itemId
        title
        excerpt
      }
    }
  }
`;
