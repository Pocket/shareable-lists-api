import { gql } from 'graphql-tag';

export const GET_SHAREABLE_LIST = gql`
  query shareableList($externalId: String!) {
    shareableList(externalId: $externalId) {
      externalId
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
        createdAt
        updatedAt
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
