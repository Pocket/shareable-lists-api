import { gql } from 'graphql-tag';
import { ShareableListPublicProps } from '../fragments.gql';

export const CREATE_SHAREABLE_LIST = gql`
  mutation createShareableList($data: CreateShareableListInput!) {
    createShareableList(data: $data) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;

export const UPDATE_SHAREABLE_LIST = gql`
  mutation updateShareableList($data: UpdateShareableListInput!) {
    updateShareableList(data: $data) {
      ...ShareableListPublicProps
    }
  }
  ${ShareableListPublicProps}
`;
