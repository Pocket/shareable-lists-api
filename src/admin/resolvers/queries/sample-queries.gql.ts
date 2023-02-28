import { gql } from 'graphql-tag';
import { ShareableListPublicProps } from '../fragments.gql';

export const SEARCH_SHAREABLE_LIST = gql`
  query searchShareableList($externalId: ID!) {
    searchShareableList(externalId: $externalId) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;
