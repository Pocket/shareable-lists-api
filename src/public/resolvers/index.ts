import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { PrismaBigIntResolver } from '../../shared/resolvers/fields/PrismaBigInt';
import { getShareableList, getShareableLists } from './queries/ShareableList';
import { isPilotUser } from './queries/PilotUser';
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
    shareableLists: getShareableLists,
    shareableListsPilotUser: isPilotUser,
  },
};
