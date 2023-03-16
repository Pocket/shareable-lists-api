import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { searchShareableList } from './queries/ShareableList';
import { moderateShareableList } from './mutations/ShareableList';

export const resolvers = {
  ...PocketDefaultScalars,
  Query: { searchShareableList },
  Mutation: { moderateShareableList },
};
