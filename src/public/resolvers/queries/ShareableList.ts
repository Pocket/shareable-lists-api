import { NotFoundError } from '@pocket-tools/apollo-utils';
import { getShareableList as dbGetShareableList } from '../../../database/queries';
import { ShareableList } from '../../../database/types';

/**
 * @param parent
 * @param userId
 * @param slug
 * @param db
 */
export async function getShareableList(
  parent,
  { userId, slug },
  { db }
): Promise<ShareableList> {
  const list = await dbGetShareableList(db, userId, slug);

  if (!list) {
    throw new NotFoundError(slug);
  }

  return list;
}
