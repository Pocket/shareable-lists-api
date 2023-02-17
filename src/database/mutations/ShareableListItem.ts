import { NotFoundError, ForbiddenError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../../shared/constants';
import { PrismaClient } from '@prisma/client';
import { ShareableListItem } from '../types';

/**
 * This mutation deletes a shareable list item. Lists that are HIDDEN cannot have their items deleted.
 *
 * @param db
 * @param externalId
 * @param userId
 */
export async function deleteShareableListItem(
  db: PrismaClient,
  externalId: string,
  userId: number | bigint
): Promise<ShareableListItem> {
  // retrieve the existing ListItem before it is deleted
  const listItem = await db.listItem.findUnique({
    where: {
      externalId,
    },
    include: {
      list: true, // also retrieve the list
    },
  });

  // Check if the ListItem was found
  if (!listItem) {
    throw new NotFoundError('A list item by that ID could not be found');
  }

  // Check that the userId in the headers matches the userId of the List
  if (Number(listItem.list.userId) !== userId) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  // Check first the List moderation status. If HIDDEN, do not allow delete
  if (listItem.list.moderationStatus == 'HIDDEN') {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }
  // delete ListItem
  await db.listItem.delete({
    where: {
      externalId: listItem.externalId,
    },
  });
  return listItem;
}
