import { gql } from 'graphql-tag';

export const GET_SHAREABLE_LIST = gql`
  query shareableList($userId: String!, $slug: String!) {
    shareableList(userId: $userId, slug: $slug) {
      slug
      title
      description
      status
      moderationStatus
      createdAt
      updatedAt
      listItems {
        url
        title
        excerpt
        imageUrl
        authors
        sortOrder
      }
    }
  }
`;

export const GET_LISTS = gql`
  query lists {
    lists {
      slug
      title
      description
      status
      moderationStatus
      listItems {
        url
        imageUrl
        title
        excerpt
      }
    }
  }
`;
