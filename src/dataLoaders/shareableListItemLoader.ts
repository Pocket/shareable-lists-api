import DataLoader from 'dataloader';

import { PrismaClient } from '@prisma/client';
import { IPublicContext } from '../public/context';
import { ShareableListItem } from '../database/types';
import { client } from '../database/client';

/**
 * @param db PrismaClient
 * @param urls
 * @param userId
 */
export async function getShareableListItemsByUrls(
  db: PrismaClient,
  urls: string[],
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
      url: { in: urls },
    },
  });
}

/**
 * Returns a sorted list of shareable list items to ensure they are
 * returned in the same order of the requested urls
 * @param urls
 * @param userId
 */
export const sortShareableListItemsByGivenUrls = (
  urls: string[],
  listItems: ShareableListItem[]
): ShareableListItem[] => {
  // create a map of urls to shareable list items
  const urlsToShareableListItem = listItems.reduce((acc, listItem) => {
    return {
      ...acc,
      [listItem.url]: listItem,
    };
  }, {});

  // sort the map in the order of the provided urls
  const sortedItems = urls.map((url) => {
    return urlsToShareableListItem[url];
  });
  return sortedItems;
};

/**
 * Grabs all shareable list items from the database
 * @param urls
 * @param userId
 */
export async function batchFetchByUrls(
  urls: string[],
  userId: number | bigint
): Promise<ShareableListItem[]> {
  const db: PrismaClient = client();
  const shareableListItems = await getShareableListItemsByUrls(
    db,
    urls,
    userId
  );

  return sortShareableListItemsByGivenUrls(urls, shareableListItems);
}

/**
 * Creates a dataLoader for shareable list items fetched by item ids filtered by current user
 * @param userId
 */
export function createShareableListItemDataLoaders(
  userId: number | bigint
): IPublicContext['dataLoaders'] {
  const shareableListItemLoader = new DataLoader(async (urls: string[]) => {
    return await batchFetchByUrls(urls, userId);
  });
  return { shareableListItemsByUrl: shareableListItemLoader };
}
