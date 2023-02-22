import { gql } from 'graphql-tag';
import {
  ShareableListPublicProps,
  ShareableListItemPublicProps,
} from '../fragments.gql';

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

export const CREATE_SHAREABLE_LIST_ITEM = gql`
  mutation createShareableListItem($data: CreateShareableListItemInput!) {
    createShareableListItem(data: $data) {
      ...ShareableListItemPublicProps
    }
  }
  ${ShareableListItemPublicProps}
`;

export const DELETE_SHAREABLE_LIST_ITEM = gql`
  mutation deleteShareableListItem($externalId: ID!) {
    deleteShareableListItem(externalId: $externalId) {
      ...ShareableListItemPublicProps
    }
  }
  ${ShareableListItemPublicProps}
`;
