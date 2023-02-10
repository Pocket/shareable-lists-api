import { gql } from 'graphql-tag';

export const GET_LISTS = gql`
  query lists {
    lists {
      externalId
      slug
      title
      description
      status
      moderationStatus
      listItems {
        externalId
        itemId
        url
        imageUrl
        title
        excerpt
      }
    }
  }
`;
