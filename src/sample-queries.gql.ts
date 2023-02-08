import { gql } from 'graphql-tag';

export const GET_LISTS = gql`
  query lists {
    lists {
      externalId
      userId
      slug
      title
      description
      status
      moderationStatus
      moderatedBy
      moderationReason
      listItems {
        externalId
        listId
        itemId
        title
        excerpt
      }
    }
  }
`;
