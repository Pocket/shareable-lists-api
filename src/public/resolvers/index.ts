import { getShareableList, getShareableLists } from './queries/ShareableList';
import {
  createShareableList,
  deleteShareableList,
  updateShareableList,
} from './mutations/ShareableList';
import {
  createShareableListItem,
  deleteShareableListItem,
} from './mutations/ShareableListItem';
import { shareableListFieldResolvers } from './fieldResolvers';

export const resolvers = {
  ShareableList: shareableListFieldResolvers,
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
  },
};
