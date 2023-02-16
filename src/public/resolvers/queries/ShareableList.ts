import { NotFoundError } from '@pocket-tools/apollo-utils';
import {
  getShareableList as dbGetShareableList,
  getShareableLists as dbGetShareableLists,
} from '../../../database/queries';
import { ShareableList } from '../../../database/types';

/**
 * Resolver for the public 'shareableList` query.
 *
 * @param parent
 * @param externalId
 * @param userId
 * @param db
 */
export async function getShareableList(
  parent,
  { externalId },
  { userId, db }
): Promise<ShareableList> {
  const list = await dbGetShareableList(db, userId, externalId);

  if (!list) {
    throw new NotFoundError(externalId);
  }

  return list;
}

/**
 * Retrieves all available shareable lists for a userId (passed thru the headers).
 *
 * @param parent
 * @param userId
 * @param db
 */
export async function getShareableLists(
  parent,
  _,
  { userId, db }
): Promise<ShareableList[]> {
  return await dbGetShareableLists(db, userId);
}
