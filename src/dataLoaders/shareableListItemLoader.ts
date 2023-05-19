import DataLoader from 'dataloader';

import { PrismaClient } from '@prisma/client';
import { IPublicContext } from '../public/context';
import { ShareableListItem } from '../database/types';
import { client } from '../database/client';

/**
 * @param db PrismaClient
 * @param itemIds
 * @param userId
 */
export async function getShareableListItemsByItemIds(
  db: PrismaClient,
  itemIds: bigint[],
  userId: number | bigint
): Promise<ShareableListItem[]> {
  if (!userId) {
    return [];
  }
  return await db.listItem.findMany({
    where: {
      // filter by current userId
      list: {
        userId,
      },
      itemId: { in: itemIds },
    },
  });
}

/**
 * Returns a sorted list of shareable list items to ensure they are
 * returned in the same order of the requested itemIds
 * @param itemIds
 * @param userId
 */
export const sortShareableListItemsByGivenItemIds = (
  itemIds: bigint[],
  listItems: ShareableListItem[]
): ShareableListItem[] => {
  // create a map of itemIds to shareable list items
  const itemIdsToShareableListItem = listItems.reduce((acc, listItem) => {
    return {
      ...acc,
      [listItem.itemId.toString()]: listItem,
    };
  }, {});

  // sort the map in the order of the provided itemIds
  const sortedItems = itemIds.map((itemId) => {
    return itemIdsToShareableListItem[itemId.toString()];
  });
  return sortedItems;
};

/**
 * Grabs all shareable list items from the database
 * @param itemIds
 * @param userId
 */
export async function batchFetchByItemIds(
  itemIds: bigint[],
  userId: number | bigint
): Promise<ShareableListItem[]> {
  const db: PrismaClient = client();
  const shareableListItems = await getShareableListItemsByItemIds(
    db,
    itemIds,
    userId
  );

  return sortShareableListItemsByGivenItemIds(itemIds, shareableListItems);
}

/**
 * Creates a dataLoader for shareable list items fetched by item ids filtered by current user
 * @param userId
 */
export function createShareableListItemDataLoaders(
  userId: number | bigint
): IPublicContext['dataLoaders'] {
  const shareableListItemLoader = new DataLoader(async (itemIds: bigint[]) => {
    return await batchFetchByItemIds(itemIds, userId);
  });
  return { shareableListItemsByItemId: shareableListItemLoader };
}
