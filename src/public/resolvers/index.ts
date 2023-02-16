import { getShareableList, getShareableLists } from './queries/ShareableList';
import {
  createShareableList,
  updateShareableList,
} from './mutations/ShareableList';
import { createShareableListItem } from './mutations/ShareableListItem';
import { shareableListFieldResolvers } from './fieldResolvers';

export const resolvers = {
  ShareableList: shareableListFieldResolvers,
  Mutation: {
    createShareableList,
    updateShareableList,
    createShareableListItem,
  },
  Query: {
    shareableList: getShareableList,
    shareableLists: getShareableLists,
  },
};
