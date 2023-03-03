import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import {
  getShareableList,
  getShareableListPublic,
  getShareableLists,
} from './queries/ShareableList';
import { PrismaBigIntResolver } from '../../shared/resolvers/fields/PrismaBigInt';
import {
  createShareableList,
  deleteShareableList,
  updateShareableList,
} from './mutations/ShareableList';
import {
  createShareableListItem,
  deleteShareableListItem,
} from './mutations/ShareableListItem';

export const resolvers = {
  ...PocketDefaultScalars,

  ShareableList: {
    userId: PrismaBigIntResolver,
  },
  ShareableListItem: {
    itemId: PrismaBigIntResolver,
  },
  Mutation: {
    createShareableList,
    deleteShareableList,
    updateShareableList,
    createShareableListItem,
    deleteShareableListItem,
  },
  Query: {
    shareableList: getShareableList,
    shareableListPublic: getShareableListPublic,
    shareableLists: getShareableLists,
  },
};
