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
): Promise<number | null> {
  if (!userId) {
    return null;
  }

  // get the total count of listItems where url is matching
  // AND parent list belongs to current userId
  const totalCount = await db.listItem.count({
    where: {
      url,
      list: {
        userId,
      },
    },
  });

  return totalCount;
}

export async function SavedItemResolver(
  parent,
  _,
  { userId, db }
): Promise<number | null> {
  return await getShareableListTotalCount(db, userId, parent.url);
}
