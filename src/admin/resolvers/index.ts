import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { searchShareableList } from './queries/ShareableList';
import { PrismaBigIntResolver } from '../../shared/resolvers/fields/PrismaBigInt';

export const resolvers = {
  ...PocketDefaultScalars,
  ShareableList: {
    userId: PrismaBigIntResolver,
  },
  Query: { searchShareableList },
};
