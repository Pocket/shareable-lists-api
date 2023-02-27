import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { searchShareableList } from './queries/ShareableList';
import { PrismaBigIntResolver } from './fields/PrismaBigInt';

export const resolvers = {
  ...PocketDefaultScalars,
  ShareableList: {
    id: PrismaBigIntResolver,
    userId: PrismaBigIntResolver,
  },
  Query: { searchShareableList },
};
