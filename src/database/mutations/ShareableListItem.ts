import {
  NotFoundError,
  ForbiddenError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
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
  if (!externalId) {
    throw new UserInputError('externalId must be provided.');
  }
  // retrieve the existing ListItem before it is deleted
  const listItem = await db.listItem.findFirst({
    where: {
      externalId,
    },
  });

  // Check if the ListItem was found
  if (!listItem) {
    throw new NotFoundError('A list item by that ID could not be found');
  }
  // Retrieve the parent List of the ListItem to be deleted
  const list = await db.list.findFirst({
    where: {
      userId,
      listItems: {
        some: { externalId: { in: [externalId] } },
      },
    },
  });

  // Check first the List moderation status. If HIDDEN, do not allow delete
  if (list.moderationStatus == 'HIDDEN') {
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
