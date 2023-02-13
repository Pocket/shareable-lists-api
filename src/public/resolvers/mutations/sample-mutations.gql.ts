import { gql } from 'graphql-tag';

export const CREATE_SHAREABLE_LIST = gql`
  mutation createShareableList($data: CreateShareableListInput!) {
    createShareableList(data: $data) {
      title
      description
      status
      moderationStatus
    }
  }
`;
