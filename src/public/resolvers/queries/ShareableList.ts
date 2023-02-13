import { NotFoundError } from '@pocket-tools/apollo-utils';
import { getShareableList as dbGetShareableList } from '../../../database/queries';
import { ShareableList } from '../../../database/types';

/**
 * Resolver for the public 'shareableList` query.
 *
 * @param parent
 * @param slug
 * @param userId
 * @param db
 */
export async function getShareableList(
  parent,
  { slug },
  { userId, db }
): Promise<ShareableList> {
  const list = await dbGetShareableList(db, userId, slug);

  if (!list) {
    throw new NotFoundError(slug);
  }

  return list;
}
