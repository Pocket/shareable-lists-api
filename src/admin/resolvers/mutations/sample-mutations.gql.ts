import { gql } from 'graphql-tag';
import { ShareableListModerationProps } from '../fragments.gql';
import { ShareableListPublicProps } from '../../../shared/fragments.gql';

export const MODERATE_SHAREABLE_LIST = gql`
  mutation moderateShareableList($data: ModerateShareableListInput!) {
    moderateShareableList(data: $data) {
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
