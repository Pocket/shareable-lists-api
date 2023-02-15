import { gql } from 'graphql-tag';
import { ShareableListPublicProps } from '../fragments.gql';

export const GET_SHAREABLE_LIST = gql`
  query shareableList($externalId: String!) {
    shareableList(externalId: $externalId) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
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
