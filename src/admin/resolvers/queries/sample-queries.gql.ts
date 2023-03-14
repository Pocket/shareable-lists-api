import { gql } from 'graphql-tag';
import { ShareableListModerationProps } from '../fragments.gql';
import { ShareableListPublicProps } from '../../../shared/fragments.gql';

export const SEARCH_SHAREABLE_LIST = gql`
  query searchShareableList($externalId: ID!) {
    searchShareableList(externalId: $externalId) {
      ... on ShareableList {
        ...ShareableListPublicProps
      }
      ... on ShareableListModeration {
        ...ShareableListModerationProps
      }
    }
  }
  ${ShareableListPublicProps}
  ${ShareableListModerationProps}
`;
