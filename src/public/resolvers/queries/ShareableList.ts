import { NotFoundError } from '@pocket-tools/apollo-utils';
import {
  getShareableList as dbGetShareableList,
  getShareableListPublic as dbGetShareableListPublic,
  getShareableLists as dbGetShareableLists,
} from '../../../database/queries';
import { ShareableList } from '../../../database/types';
import { validateUserId } from '../utils';

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
  const list = await dbGetShareableList(db, validateUserId(userId), externalId);

  if (!list) {
    throw new NotFoundError(externalId);
  }

  return list;
}

/**
 * Resolver for the `shareableListPublic` query.
 * Note the userId for this query comes from a request variable
 * and not authentication headers.
 *
 * @param parent
 * @param slug
 * @param userId
 * @param db
 */
export async function getShareableListPublic(
  parent,
  { externalId },
  { db }
): Promise<ShareableList> {
  const list = await dbGetShareableListPublic(db, externalId);

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
  return await dbGetShareableLists(db, validateUserId(userId));
}
