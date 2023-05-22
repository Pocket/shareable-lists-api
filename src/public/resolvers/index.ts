import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { PrismaBigIntResolver } from '../../shared/resolvers/fields/PrismaBigInt';
import { ItemResolver } from '../../shared/resolvers/fields/Item';
import { UserResolver } from '../../shared/resolvers/fields/User';
import {
  getShareableList,
  getShareableListPublic,
  getShareableLists,
} from './queries/ShareableList';
import { isPilotUser } from './queries/PilotUser';
import {
  createShareableList,
  deleteShareableList,
  updateShareableList,
} from './mutations/ShareableList';
import {
  createShareableListItem,
  deleteShareableListItem,
  updateShareableListItem,
  updateShareableListItems,
} from './mutations/ShareableListItem';
import { shareableListItem } from './saveditem';

export const resolvers = {
  ...PocketDefaultScalars,
  ShareableList: {
    user: UserResolver,
  },
  ShareableListPublic: {
    user: UserResolver,
  },
  SavedItem: {
    shareableListItem,
  },
  ShareableListItem: {
    itemId: PrismaBigIntResolver,
    item: ItemResolver,
  },
  Mutation: {
    createShareableList,
    deleteShareableList,
    updateShareableList,
    createShareableListItem,
    updateShareableListItem,
    updateShareableListItems,
    deleteShareableListItem,
  },
  Query: {
    shareableList: getShareableList,
    shareableListPublic: getShareableListPublic,
    shareableLists: getShareableLists,
    shareableListsPilotUser: isPilotUser,
  },
};
