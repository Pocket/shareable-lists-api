import { gql } from 'graphql-tag';
import {
  ShareableListPublicProps,
  ShareableListPublicQueryProps,
} from '../../../shared/fragments.gql';

export const GET_SHAREABLE_LIST = gql`
  query shareableList($externalId: ID!) {
    shareableList(externalId: $externalId) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;

export const GET_SHAREABLE_LIST_PUBLIC = gql`
  query shareableListPublic($externalId: ID!, $slug: String!) {
    shareableListPublic(externalId: $externalId, slug: $slug) {
      ...ShareableListPublicQueryProps
    }
  }
  ${ShareableListPublicQueryProps}
`;

export const GET_SHAREABLE_LISTS = gql`
  query shareableLists {
    shareableLists {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;

export const SHAREABLE_LISTS_PILOT_USER = gql`
  query shareableListsPilotUser {
    shareableListsPilotUser
  }
`;

export const SHAREABLE_LIST_TOTAL_COUNT_SAVEDITEM_REFERENCE_RESOLVER = gql`
  query ($url: String) {
    _entities(representations: { url: $url, __typename: "SavedItem" }) {
      ... on SavedItem {
        url
        shareableListTotalCount
      }
    }
  }
`;
