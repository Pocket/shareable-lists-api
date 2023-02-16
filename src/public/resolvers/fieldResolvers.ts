/**
 * Field-level resolvers for the public ShareableList type.
 */
import { ShareableList } from '../../database/types';
import { getShareableList } from '../../database/queries';

export const shareableListFieldResolvers = {
  async slug(parent: ShareableList, _, { db, userId }): Promise<string> {
    if (!parent.slug) {
      // If a slug is not set, let's not touch it at all.
      return null;
    } else {
      // Compose the slug value out of the stored value for it
      // and a portion of the UUID string for `externalId`
      const list = await getShareableList(db, userId, parent.externalId);
      return `${list.slug}-${list.externalId.substring(
        0,
        list.externalId.indexOf('-')
      )}`;
    }
  },
};
