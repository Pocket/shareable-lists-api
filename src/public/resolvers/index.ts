import { getShareableList, getShareableLists } from './queries/ShareableList';
import { createShareableList } from './mutations/ShareableList';

export const resolvers = {
  Mutation: { createShareableList },
  Query: {
    shareableList: getShareableList,
    shareableLists: getShareableLists,
  },
};
