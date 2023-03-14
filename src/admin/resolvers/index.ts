import { PocketDefaultScalars } from '@pocket-tools/apollo-utils';
import { searchShareableList } from './queries/ShareableList';
import { moderateShareableList } from './mutations/ShareableList';
import { PrismaBigIntResolver } from '../../shared/resolvers/fields/PrismaBigInt';
import { ShareableListComplete } from '../../database/types';

export const resolvers = {
  ...PocketDefaultScalars,
  ShareableList: {
    userId: PrismaBigIntResolver,
  },
  ShareableListModeration: {
    async moderationReason(
      parent: ShareableListComplete,
      { externalId },
      { db, authenticatedUser }
    ): Promise<string> {
      return 'this is a test';
    },
  },
  ShareableListResult: {
    __resolveType(obj, context, info) {
      if (obj.externalId) {
        return 'ShareableList';
      }

      if (obj.moderationReason) {
        return 'ShareableListModeration';
      }

      return null;
    },
  },

  Query: { searchShareableList },
  Mutation: { moderateShareableList },
};
