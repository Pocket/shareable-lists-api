import { gql } from 'graphql-tag';
import { ShareableListPublicProps } from '../fragments.gql';

export const MODERATE_SHAREABLE_LIST = gql`
  mutation moderateShareableList($data: ModerateShareableListInput!) {
    moderateShareableList(data: $data) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;
