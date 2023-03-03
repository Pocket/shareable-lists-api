import { ModerationStatus, PrismaClient } from '@prisma/client';
import { ShareableList, ShareableListComplete } from '../types';

/**
 * This is a public query, which is why we only return
 * a subset of ShareableList properties.
 * Retrieves a single list for a given userId from the datastore.
 *
 * @param db
 * @param userId
 * @param externalId
 */
export function getShareableList(
  db: PrismaClient,
  userId: number | bigint,
  externalId: string
): Promise<ShareableList> {
  // externalId is unique, but the generated type for `findUnique` here doesn't
  // include `moderationStatus`, so using `findFirst` instead
  return db.list.findFirst({
    where: {
      userId,
      externalId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: {
      listItems: true,
    },
  });
}

/**
 * This is a public query.
 * Retrieves all available shareable lists for a given userId from the datastore.
 *
 * @param db
 * @param userId
 */
export function getShareableLists(
  db: PrismaClient,
  userId: number | bigint
): Promise<ShareableList[]> {
  return db.list.findMany({
    where: {
      userId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      listItems: true,
    },
  });
}

/**
 * This is an admin query.
 * Searches for a single list by externalId for any user from the datastore.
 *
 * @param db
 * @param externalId
 */
export function searchShareableList(
  db: PrismaClient,
  externalId: string
): Promise<ShareableListComplete> {
  return db.list.findUnique({
    where: {
      externalId,
    },
    include: {
      listItems: true,
    },
  });
}
