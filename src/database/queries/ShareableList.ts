import { ModerationStatus, PrismaClient } from '@prisma/client';
import { ShareableList } from '../types';

/**
 * This query returns a publicly viewable Shareable List, retrieved by its
 * composite slug and user ID
 *
 * @param db
 * @param userId
 * @param slug
 */
export async function getPublicShareableList(
  db: PrismaClient,
  userId: number | bigint,
  slug: string
): Promise<ShareableList> {
  // Work out the value of the slug that is stored in the DB.
  // Note that this is dependent on the implementation of the slug
  // returned in `shareableListFieldResolvers`.
  const matches = slug.match(/^(.+?)-[a-z\d]{8}$/i);
  const storedSlug = matches[0];

  return db.list.findFirst({
    where: {
      userId,
      slug: storedSlug,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: {
      listItems: true,
    },
  });
}

/**
 * This query returns a shareable list created and owned by a Pocket user.
 *
 * @param db
 * @param userId
 * @param externalId
 */
export async function getShareableList(
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
 * Retrieves all available shareable lists for a given userId from the datastore.
 *
 * @param db
 * @param userId
 */
export async function getShareableLists(
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
