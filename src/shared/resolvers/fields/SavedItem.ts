import { PrismaClient } from '@prisma/client';

/**
 * Returns the total count of shareable lists a save is in by the save url.
 *
 * @param db
 * @param userId
 * @param url
 */
export async function getShareableListTotalCount(
  db: PrismaClient,
  userId: number | bigint,
  url: string
): Promise<number> {
  if (!userId) {
    return null;
  }
  // find shareable list items where url matches given
  // and where parent list belongs to current user
  const listItems = await db.listItem.findMany({
    where: {
      url,
      list: {
        userId,
      },
    },
  });
  const totalCount = listItems.length;

  return totalCount;
}

export async function SavedItemResolver(parent, _, { userId, db }) {
  return await getShareableListTotalCount(db, userId, parent.url);
}
