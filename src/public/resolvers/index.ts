import { getShareableList, getShareableLists } from './queries/ShareableList';
import {
  createShareableList,
  updateShareableList,
} from './mutations/ShareableList';
import { shareableListFieldResolvers } from './fieldResolvers';

export const resolvers = {
  ShareableList: shareableListFieldResolvers,
  Mutation: { createShareableList, updateShareableList },
  Query: {
    shareableList: getShareableList,
    shareableLists: getShareableLists,
  },
};
