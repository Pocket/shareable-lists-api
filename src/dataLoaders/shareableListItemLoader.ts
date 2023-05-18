import DataLoader from 'dataloader';

import { PrismaClient } from '@prisma/client';

import { ShareableListItem } from '../database/types';
import { client } from '../database/client';

/**
 * @param db PrismaClient
 * @param itemIds
 */
export async function getShareableListItemsByItemIds(
  db: PrismaClient,
  itemIds: bigint[]
): Promise<ShareableListItem[]> {
  return await db.listItem.findMany({
    where: { itemId: { in: itemIds } },
  });
}

export const sortShareableListItemsByGivenItemIds = (
  itemIds: bigint[],
  listItems: ShareableListItem[]
): ShareableListItem[] => {
  // create a map of itemIds to shareable list items
  const itemIdsToShareableListItem = listItems.reduce((acc, listItem) => {
    if (listItem) {
      return {
        ...acc,
        [listItem.itemId.toString()]: listItem,
      };
    }

    return acc;
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
 */
export const batchFetchByItemIds = async (
  itemIds: bigint[]
): Promise<ShareableListItem[]> => {
  const db: PrismaClient = client();

  const shareableListItems = await getShareableListItemsByItemIds(db, itemIds);

  return sortShareableListItemsByGivenItemIds(itemIds, shareableListItems);
};

/**
 * Loader to batch requests
 */
export const shareableListItemLoader = new DataLoader(batchFetchByItemIds);
