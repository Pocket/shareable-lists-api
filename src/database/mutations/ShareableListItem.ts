import {
  ForbiddenError,
  NotFoundError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { ModerationStatus, PrismaClient } from '@prisma/client';
import { CreateShareableListItemInput, ShareableListItem } from '../types';
import {
  ACCESS_DENIED_ERROR,
  PRISMA_RECORD_NOT_FOUND,
} from '../../shared/constants';

import { sendEventHelper as sendEvent } from '../../snowplow/events';
import { EventBridgeEventType } from '../../snowplow/types';

/**
 * This mutation creates a shareable list item.
 *
 * @param db
 * @param data
 * @param userId
 */
export async function createShareableListItem(
  db: PrismaClient,
  data: CreateShareableListItemInput,
  userId: number | bigint
): Promise<ShareableListItem> {
  // Retrieve the list this item should be added to.
  // Note: no new items should be added to lists that have been taken down
  // by the moderators.
  const list = await db.list.findFirst({
    where: {
      externalId: data.listExternalId,
      userId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
  });

  if (!list) {
    throw new NotFoundError(
      `A list with the ID of "${data.listExternalId}" does not exist`
    );
  }

  // Check that the userId in the headers matches the userId of the List
  if (Number(list.userId) !== userId) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  // check if an item with this URL already exists in this list
  const itemExists = await db.listItem.count({
    where: { listId: list.id, url: data.url },
  });

  if (itemExists) {
    throw new UserInputError(
      `An item with the URL "${data.url}" already exists in this list`
    );
  }

  const input = {
    itemId: data.itemId,
    url: data.url,
    title: data.title ?? undefined,
    excerpt: data.excerpt ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    publisher: data.publisher ?? undefined,
    authors: data.authors ?? undefined,
    sortOrder: data.sortOrder,
    listId: list.id,
  };

  const listItem = await db.listItem.create({
    data: input,
  });

  //send event bridge event for shareable-list-item-created event type
  await sendEvent(EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED, {
    shareableListItem: listItem,
    shareableListItemExternalId: listItem.externalId,
    listExternalId: list.externalId,
    isShareableListItemEventType: true,
  });

  return listItem;
}

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

  // Check first the List moderation status. If HIDDEN, do not allow to delete
  if (listItem.list.moderationStatus == 'HIDDEN') {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }
  // delete ListItem
  await db.listItem
    .delete({
      where: { externalId: listItem.externalId },
    })
    .catch((error) => {
      if (error.code === PRISMA_RECORD_NOT_FOUND) {
        throw new NotFoundError(`List Item ${externalId} cannot be found.`);
      } else {
        // some unexpected DB error
        throw error;
      }
    });

  //send event bridge event for shareable-list-item-deleted event type
  await sendEvent(EventBridgeEventType.SHAREABLE_LIST_ITEM_DELETED, {
    shareableListItem: listItem,
    shareableListItemExternalId: listItem.externalId,
    listExternalId: listItem.list.externalId,
    isShareableListItemEventType: true,
  });

  return listItem;
}

/**
 * Deletes all list items for a list.
 * NB: userId is not checked here, as this method is called
 * @param db
 * @param listId
 * @returns
 */
export async function deleteAllListItemsForList(
  db: PrismaClient,
  listId: bigint
): Promise<number> {
  const batchResult = await db.listItem.deleteMany({
    where: { listId: listId },
  });

  return batchResult.count;
}
