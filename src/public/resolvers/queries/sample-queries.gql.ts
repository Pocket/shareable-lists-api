import { gql } from 'graphql-tag';
import { ShareableListPublicProps } from '../fragments.gql';

export const GET_SHAREABLE_LIST = gql`
  query shareableList($externalId: ID!) {
    shareableList(externalId: $externalId) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;

export const GET_SHAREABLE_LIST_PUBLIC = gql`
  query shareableListPublic($slug: String!, $userId: Float!) {
    shareableListPublic(slug: $slug, userId: $userId) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;

export const GET_SHAREABLE_LISTS = gql`
  query shareableLists {
    shareableLists {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;
